const ANON_NAMES = ['吃货喵', '馋嘴猫', '干饭喵', '探店喵', '觅食喵', '品鉴喵', '寻味喵', '尝鲜喵', '老饕喵', '滋味喵'];

Page({
  data: {
    roomId: '',
    bannerCatUrl: '',
    isTipExpanded: false,
    showPosterModal: false,
    posterData: null,
    roomCode: '731286',
    roomTitle: '周二晚撸串建设北路',
    roomAddress: '建设北路',
    roomTime: '4月28日 18:00',
    roomStatus: 'voting',
    statusText: '投票中',
    isAnonymous: false,
    needPassword: false,
    roomPassword: '',
    qrCodeUrl: '',
    countdown: '02:15:30',
    countdownTimer: null,
    pollTimer: null,
    votedCount: 1,
    unvotedCount: 0,
    progressPercent: 100,
    participants: [
      { id: 'o001', nickName: '喵友9606', avatarUrl: '', isVoted: true, isHost: true, anonName: '吃货喵', choices: [] }
    ],
    topOptions: [
      { id: 'sub_01_01', name: '经典川菜', image: '/images/category_01_01.jpg', count: 3, percent: 75 },
      { id: 'sub_01_02', name: '重庆火锅', image: '/images/category_01_02.jpg', count: 2, percent: 50 },
      { id: 'sub_10_02', name: '麻辣香锅', image: '/images/category_10_02.jpg', count: 2, percent: 50 }
    ],
    winner: {
      name: '味记小渔匠肥肠鱼稻田蛙',
      address: '东郊记忆店',
      category: '川菜',
      price: 68,
      image: '/images/shop_demo.jpg',
      voteCount: 4,
      votePercent: 80
    }
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    this.setData({ roomId });
    this.loadBannerCat();
    this.startCountdown();
    this.calculateStats(this.data.participants);
    if (roomId && wx.cloud) {
      this.fetchRoomData(roomId);
    }
  },

  loadBannerCat() {
    this.setData({ bannerCatUrl: 'https://636c-cloud1-d5ggnf5wh2d872f3c-1423896909.tcb.qcloud.la/decorations/cat-fish-logo.png' });
  },

  onUnload() {
    this.clearAllTimers();
  },

  onHide() {
    this.clearAllTimers();
  },

  onShow() {
    this.startCountdown();
    if (this.data.roomId && this.data.roomStatus === 'voting' && wx.cloud) {
      this.startPolling();
    }
  },

  fetchRoomData(roomId) {
    wx.cloud.callFunction({
      name: 'getRoomDetail',
      data: { roomId },
      timeout: 5000
    }).then(res => {
      if (res.result && res.result.code === 0 && res.result.data) {
        const room = res.result.data;
        const isAnon = room.isAnonymous || false;
        const participants = (room.participants || []).map((p, idx) => ({
          ...p,
          anonName: ANON_NAMES[idx % ANON_NAMES.length] + (idx >= ANON_NAMES.length ? (idx + 1) : '')
        }));
        this.setData({
          _id: room._id,
          roomCode: room.roomCode || '',
          roomTitle: room.title || '',
          roomAddress: room.address || '',
          roomTime: this.formatTime(room.mealTime),
          roomStatus: room.status || 'voting',
          statusText: this.getStatusText(room.status),
          isAnonymous: isAnon,
          needPassword: room.needPassword || false,
          roomPassword: room.roomPassword || '',
          participants: participants
        });
        this.calculateStats(participants);
        if (room.status === 'voting') {
          this.fetchVoteStats(roomId);
        }
        if (room.status === 'locked') {
          this.loadLockedResult();
        }
      }
    }).catch(err => {
      console.error('获取房间详情失败:', err);
    });
  },

  toggleAnonymous() {
    if (this.data.roomStatus !== 'voting') {
      wx.showToast({ title: '投票已结束，无法更改', icon: 'none' });
      return;
    }
    const newVal = !this.data.isAnonymous;
    wx.showModal({
      title: newVal ? '开启匿名投票？' : '关闭匿名投票？',
      content: newVal ? '开启后，所有人的投票身份将互不可见，仅房主可在控制台查看汇总。' : '关闭后，所有人的投票身份将对全员可见。',
      confirmColor: '#FF9F43',
      success: (res) => {
        if (res.confirm) {
          this.doToggleAnonymous(newVal);
        }
      }
    });
  },

  doToggleAnonymous(newVal) {
    if (!wx.cloud) {
      this.setData({ isAnonymous: newVal });
      wx.showToast({ title: newVal ? '已开启匿名投票' : '已关闭匿名投票', icon: 'success' });
      return;
    }
    wx.showLoading({ title: '设置中...' });
    wx.cloud.callFunction({
      name: 'setAnonymousMode',
      data: { roomId: this.data.roomId, isAnonymous: newVal },
      timeout: 5000
    }).then(() => {
      wx.hideLoading();
      this.setData({ isAnonymous: newVal });
      wx.showToast({ title: newVal ? '已开启匿名投票' : '已关闭匿名投票', icon: 'success' });
    }).catch(err => {
      wx.hideLoading();
      console.error('设置匿名模式失败:', err);
      wx.showToast({ title: '设置失败', icon: 'none' });
    });
  },

  calculateStats(participants) {
    const voted = participants.filter(p => p.isVoted).length;
    const total = participants.length;
    const percent = total > 0 ? Math.round((voted / total) * 100) : 0;
    this.setData({ votedCount: voted, unvotedCount: total - voted, progressPercent: percent });
  },

  fetchVoteStats(roomId) {
    if (!wx.cloud) return;
    wx.cloud.callFunction({
      name: 'getVoteStats',
      data: { roomId },
      timeout: 5000
    }).then(res => {
      if (res.result) {
        const stats = res.result;
        this.setData({
          votedCount: stats.votedCount || 0,
          unvotedCount: stats.unvotedCount || 0,
          progressPercent: stats.progressPercent || 0,
          topOptions: stats.topOptions || []
        });
      }
    }).catch(err => {
      console.error('获取投票统计失败:', err);
    });
  },

  startCountdown() {
    this.clearCountdown();
    const deadline = Date.now() + (2 * 60 * 60 + 15 * 60 + 30) * 1000;
    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        this.setData({ countdown: '00:00:00' });
        this.clearCountdown();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const pad = n => n < 10 ? '0' + n : n;
      this.setData({ countdown: `${pad(h)}:${pad(m)}:${pad(s)}` });
    };
    update();
    this.setData({ countdownTimer: setInterval(update, 1000) });
  },

  clearCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
  },

  startPolling() {
    this.clearPolling();
    if (this.data.roomStatus === 'voting' && this.data.roomId) {
      this.setData({ pollTimer: setInterval(() => this.fetchVoteStats(this.data.roomId), 3000) });
    }
  },

  clearPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.setData({ pollTimer: null });
    }
  },

  clearAllTimers() {
    this.clearCountdown();
    this.clearPolling();
  },

  copyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => wx.showToast({ title: `房间号 ${this.data.roomCode} 已复制`, icon: 'none' })
    });
  },

  shareRoom() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShareAppMessage() {
    return {
      title: `「${this.data.roomTitle}」快来一起选餐厅！`,
      path: `/pages/room/join?roomCode=${this.data.roomCode}`,
      imageUrl: '/assets/share-cover.png'
    };
  },

  handleMemberTap(e) {
    const idx = e.currentTarget.dataset.index;
    const member = this.data.participants[idx];
    if (!member.isVoted) {
      wx.showToast({ title: '该成员尚未投票', icon: 'none' });
      return;
    }
    if (!this.data.isAnonymous) {
      wx.showModal({
        title: `${member.nickName} 的投票`,
        content: (member.choices || ['暂无记录']).join('、'),
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#FF9F43'
      });
      return;
    }
    wx.showToast({ title: '匿名模式下不可查看个人选择', icon: 'none' });
  },

  remindMember(e) {
    const id = e.currentTarget.dataset.id;
    const member = this.data.participants.find(p => p.id === id);
    if (!member || member.isVoted) return;
    wx.showModal({
      title: '提醒投票',
      content: `给 ${this.data.isAnonymous ? member.anonName : member.nickName} 发送催票通知？`,
      confirmColor: '#FF9F43',
      success: (res) => {
        if (res.confirm) {
          this.sendReminder(id);
        }
      }
    });
  },

  sendReminder(targetId) {
    if (!wx.cloud) {
      wx.showToast({ title: '提醒已发送（演示）', icon: 'success' });
      return;
    }
    wx.cloud.callFunction({
      name: 'sendReminder',
      data: { roomId: this.data.roomId, targetId, roomTitle: this.data.roomTitle, isAnonymous: this.data.isAnonymous },
      timeout: 5000
    }).then(() => {
      wx.showToast({ title: '提醒已发送', icon: 'success' });
    }).catch(() => {
      wx.showToast({ title: '发送失败', icon: 'none' });
    });
  },

  editRoom() {
    if (this.data.roomStatus === 'locked') {
      wx.showToast({ title: '已锁定，无法编辑', icon: 'none' });
      return;
    }
    // 跳转到编辑页面，带上房间ID
    wx.navigateTo({
      url: `/pages/create-mode-b/create-mode-b?edit=true&roomId=${this.data.roomId}`
    });
  },

  lockResult() {
    if (this.data.roomStatus === 'locked') {
      wx.showToast({ title: '结果已锁定', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '锁定聚餐地点',
      content: '锁定后将停止投票，所有人会收到最终通知。确定现在锁定吗？',
      confirmText: '确认锁定',
      confirmColor: '#FF9F43',
      cancelText: '再等等',
      success: (res) => {
        if (res.confirm) {
          this.doLockResult();
        }
      }
    });
  },

  doLockResult() {
    if (this.data.roomStatus === 'locked') {
      this.setData({ roomStatus: 'locked', statusText: '已锁定' });
      wx.showToast({ title: '结果已锁定', icon: 'success' });
      return;
    }
    
    // 检查 _id 是否存在
    if (!this.data._id) {
      wx.showToast({ title: '房间数据加载中，请稍候', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '计算结果中...', mask: true });
    wx.cloud.callFunction({
      name: 'lockRoom',
      data: { roomId: this.data._id },
      timeout: 10000
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.code === 0) {
        this.setData({ roomStatus: 'locked', statusText: '已锁定' });
        this.clearPolling();
        // 加载锁定结果
        this.loadLockedResult();
        wx.showModal({
          title: '结果已锁定',
          content: '投票已结束，最终结果已确定',
          showCancel: false,
          confirmText: '查看结果',
          confirmColor: '#FF9F43'
        });
      } else {
        wx.showToast({ title: res.result?.msg || '锁定失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('锁定失败:', err);
      wx.showToast({ title: '锁定失败，请重试', icon: 'none' });
    });
  },

  loadLockedResult() {
    if (!wx.cloud) return;
    wx.cloud.callFunction({
      name: 'getLockedResult',
      data: { roomId: this.data.roomId },
      timeout: 5000
    }).then(res => {
      if (res.result && res.result.winner) {
        this.setData({ winner: res.result.winner });
      }
    }).catch(err => {
      console.error('加载锁定结果失败:', err);
    });
  },

  shareToFriends() {
    const itemList = ['分享到聊天', '复制房间号', '生成分享海报'];
    if (this.data.roomStatus === 'locked' && this.data.winner) {
      itemList.push('生成结果海报');
    }

    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0: this.shareRoom(); break;
          case 1: this.copyRoomCode(); break;
          case 2: this.generateSharePoster(); break;
          case 3:
            if (this.data.roomStatus === 'locked' && this.data.winner) {
              this.generateResultPoster();
            }
            break;
        }
      }
    });
  },

  generateSharePoster() {
    const posterData = {
      type: 'share',
      roomTitle: this.data.roomTitle,
      roomCode: this.data.roomCode,
      roomPassword: this.data.roomPassword,
      needPassword: this.data.needPassword,
      roomTime: this.data.roomTime,
      roomAddress: this.data.roomAddress,
      winner: this.data.winner,
      // 小程序码URL，需要通过云函数生成
      qrCodeUrl: this.data.qrCodeUrl || '',
      // 餐厅图片列表（用于未选定时的层叠效果）
      restaurantImages: this.data.topOptions ? this.data.topOptions.map(o => o.image).filter(Boolean) : []
    };
    this.setData({
      posterData,
      showPosterModal: true
    });
    
    // 如果没有小程序码，尝试生成
    if (!this.data.qrCodeUrl && this.data.roomId) {
      this.generateQRCode();
    }
  },
  
  // 生成小程序码
  async generateQRCode() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${this.data.roomId}`,
          page: 'pages/vote/vote'
        }
      });
      if (result.code === 0 && result.data) {
        this.setData({ qrCodeUrl: result.data });
      }
    } catch (err) {
      console.error('生成小程序码失败:', err);
    }
  },

  generateResultPoster() {
    const posterData = {
      winner: this.data.winner,
      roomTitle: this.data.roomTitle,
      roomTime: this.data.roomTime,
      roomAddress: this.data.roomAddress,
      participants: this.data.participants,
      isAnonymous: this.data.isAnonymous
    };
    this.setData({
      posterData,
      showPosterModal: true
    });
  },

  onPosterClose() {
    this.setData({ showPosterModal: false });
  },

  onPosterSave(e) {
    console.log('海报已保存:', e.detail.imagePath);
  },

  onPosterShare(e) {
    const { imagePath } = e.detail;
    wx.showShareImageMenu({
      path: imagePath,
      success: () => {
        wx.showToast({ title: '分享成功', icon: 'success' });
      },
      fail: (err) => {
        console.error('分享失败:', err);
      }
    });
  },

  formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => n < 10 ? '0' + n : n;
    return `${pad(d.getMonth() + 1)}月${pad(d.getDate())}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  getStatusText(status) {
    const map = { 'voting': '投票中', 'locked': '已锁定', 'ended': '已结束' };
    return map[status] || '未知';
  },

  toggleTipExpand() {
    this.setData({ isTipExpanded: !this.data.isTipExpanded });
  }
});
