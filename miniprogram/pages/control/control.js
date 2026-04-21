Page({
  data: {
    roomId: '',
    room: {},
    voteStats: null,
    participants: [],
    isCreator: false,
    loading: true,
    showLockConfirm: false,
    selectedPosterIndex: -1,
    selectedPosterVotes: 0,
    finalTime: '',
    finalAddress: '',
    timeRange: [
      ['今天', '明天', '后天'],
      ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00']
    ]
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadData();
  },

  onShow() {
    if (this.data.roomId) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadData() {
    this.setData({ loading: true });
    
    try {
      // 获取房间数据
      const roomRes = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });
      
      if (roomRes.result.code !== 0) {
        throw new Error(roomRes.result.msg);
      }
      
      const room = roomRes.result.data;
      
      // 获取投票统计
      const statsRes = await wx.cloud.callFunction({
        name: 'countVotes',
        data: { roomId: this.data.roomId }
      });
      
      if (statsRes.result.code !== 0) {
        throw new Error(statsRes.result.msg);
      }
      
      const voteStats = statsRes.result.data;
      
      this.setData({
        room,
        voteStats,
        participants: room.participants || [],
        isCreator: room.isCreator,
        loading: false
      });
      
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 分享房间
  onShareAppMessage() {
    return {
      title: `【${this.data.room.title}】来投票决定吃什么！`,
      path: `/pages/vote/vote?roomId=${this.data.roomId}`,
      imageUrl: this.data.room.candidatePosters?.[0]?.imageUrl || ''
    };
  },

  // 选择最终海报
  selectFinalPoster(e) {
    const { index } = e.currentTarget.dataset;
    const selectedPosterVotes = this.calcPosterVotes(index);
    this.setData({ 
      selectedPosterIndex: index,
      selectedPosterVotes: selectedPosterVotes
    });
  },

  // 计算海报票数
  calcPosterVotes(index) {
    const { voteStats } = this.data;
    if (!voteStats || !voteStats.validPosters || index < 0) {
      return 0;
    }
    const poster = voteStats.validPosters.find(function(i) {
      return i.index === index;
    });
    return poster ? poster.likes : 0;
  },

  // 时间选择
  onTimeChange(e) {
    const [dayIdx, timeIdx] = e.detail.value;
    const days = this.data.timeRange[0];
    const times = this.data.timeRange[1];
    this.setData({ finalTime: `${days[dayIdx]} ${times[timeIdx]}` });
  },

  // 地址输入
  onAddressInput(e) {
    this.setData({ finalAddress: e.detail.value });
  },

  // 显示锁定确认
  showLockModal() {
    const { selectedPosterIndex, voteStats } = this.data;
    let newIndex = selectedPosterIndex;
    
    if (selectedPosterIndex === -1 && voteStats && voteStats.validPosters.length > 0) {
      // 自动选择票数最高的
      newIndex = voteStats.validPosters[0].index;
    }
    
    const selectedPosterVotes = this.calcPosterVotes(newIndex);
    
    this.setData({ 
      selectedPosterIndex: newIndex,
      selectedPosterVotes: selectedPosterVotes,
      showLockConfirm: true 
    });
  },

  // 关闭锁定确认
  closeLockModal() {
    this.setData({ showLockConfirm: false });
  },

  // 锁定房间
  async lockRoom() {
    const { roomId, selectedPosterIndex, finalTime, finalAddress } = this.data;
    
    if (selectedPosterIndex === -1) {
      wx.showToast({ title: '请选择最终海报', icon: 'none' });
      return;
    }
    
    try {
      wx.showLoading({ title: '锁定中' });
      
      const { result } = await wx.cloud.callFunction({
        name: 'lockRoom',
        data: {
          roomId,
          finalPosterIndex: selectedPosterIndex,
          finalTime,
          finalAddress
        }
      });
      
      if (result.code !== 0) {
        throw new Error(result.msg);
      }
      
      wx.hideLoading();
      this.setData({ showLockConfirm: false });
      
      wx.showToast({ title: '已锁定', icon: 'success' });
      
      // 跳转到结果页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/result/result?roomId=${roomId}`
        });
      }, 1500);
      
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '锁定失败', icon: 'none' });
    }
  },

  // 预览海报
  previewPoster(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.room.candidatePosters?.map(p => p.imageUrl) || [];
    wx.previewImage({ urls, current: url });
  },

  // 查看投票详情
  viewVoteDetail() {
    wx.showModal({
      title: '投票详情',
      content: `已投票: ${this.data.voteStats?.totalVoters || 0}人`,
      showCancel: false
    });
  },

  // 复制房间号
  copyRoomId() {
    wx.setClipboardData({
      data: this.data.roomId,
      success: () => {
        wx.showToast({ title: '已复制房间号', icon: 'success' });
      }
    });
  }
});
