const app = getApp();

Page({
  data: {
    room: {},
    posters: [],
    currentIndex: 0,
    cardAreaHeight: 500,
    
    // 滑动状态
    touchStartX: 0,
    touchStartY: 0,
    currentTranslateX: 0,
    isSwiping: false,
    
    // 撤销功能
    showUndo: false,
    undoCountdown: 3,
    lastAction: '',
    lastPosterName: '',
    undoTimer: null,
    
    // 禁忌选择
    tabooExpanded: false,
    selectedHardTaboos: [],
    selectedSoftTaboos: [],
    hardTaboos: [
      { name: 'spicy', label: '辣', selected: false },
      { name: 'seafood', label: '海鲜', selected: false },
      { name: 'mutton', label: '羊肉', selected: false },
      { name: 'beef', label: '牛肉', selected: false },
      { name: 'pork', label: '猪肉', selected: false },
      { name: 'alcohol', label: '酒', selected: false }
    ],
    softTaboos: [
      { name: 'oily', label: '油腻', selected: false },
      { name: 'sweet', label: '过甜', selected: false },
      { name: 'noisy', label: '吵闹', selected: false },
      { name: 'far', label: '太远', selected: false }
    ],
    
    // 时间/请假
    timeType: 'departure',
    selectedTime: '',
    leaveReason: '',
    timeRange: [
      ['今天', '明天', '后天'],
      ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00']
    ],
    
    // 投票数据
    likedIndices: [],
    vetoedIndices: [],
    canSubmit: false
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomData(roomId);
    this.initCardArea();
  },

  onUnload() {
    if (this.data.undoTimer) {
      clearInterval(this.data.undoTimer);
    }
  },

  initCardArea() {
    const sysInfo = wx.getSystemInfoSync();
    const cardAreaHeight = sysInfo.windowHeight - 300;
    this.setData({ cardAreaHeight });
  },

  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });
      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId }
      });
      
      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;
      const posters = room.candidatePosters.map((p, index) => ({
        ...p,
        index,
        status: '',
        animClass: '',
        style: '',
        showScratch: false,
        showPaw: false,
        isVetoed: false
      }));

      this.setData({
        room,
        posters
      });
      
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 触摸开始
  onTouchStart(e) {
    const { index } = e.currentTarget.dataset;
    if (index !== this.data.currentIndex) return;
    
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      isSwiping: true
    });
  },

  // 触摸移动
  onTouchMove(e) {
    if (!this.data.isSwiping) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.touchStartX;
    const deltaY = touch.clientY - this.data.touchStartY;
    
    // 主要水平滑动才响应
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const rotate = deltaX * 0.05;
      const style = `transform: translateX(${deltaX}px) rotate(${rotate}deg)`;
      
      const posters = this.data.posters;
      const currentPoster = posters[this.data.currentIndex];
      
      this.setData({
        [`posters[${this.data.currentIndex}].style`]: style,
        [`posters[${this.data.currentIndex}].showScratch`]: deltaX < -30,
        [`posters[${this.data.currentIndex}].showPaw`]: deltaX > 30
      });
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    if (!this.data.isSwiping) return;
    
    const sysInfo = wx.getSystemInfoSync();
    const threshold = sysInfo.windowWidth * 0.3;
    
    const posters = this.data.posters;
    const currentPoster = posters[this.data.currentIndex];
    
    // 从style中解析当前位移
    const style = currentPoster.style || '';
    const match = style.match(/translateX\(([-\d.]+)px\)/);
    const currentX = match ? parseFloat(match[1]) : 0;
    
    if (Math.abs(currentX) > threshold) {
      // 触发切换
      if (currentX > 0) {
        this.swipeRight();
      } else {
        this.swipeLeft();
      }
    } else {
      // 复位
      this.setData({
        [`posters[${this.data.currentIndex}].style`]: 'transform: translateX(0) rotate(0)',
        [`posters[${this.data.currentIndex}].showScratch`]: false,
        [`posters[${this.data.currentIndex}].showPaw`]: false
      });
    }
    
    this.setData({ isSwiping: false });
  },

  // 左滑 - 排除/否决
  swipeLeft() {
    const { currentIndex, posters, selectedHardTaboos } = this.data;
    const poster = posters[currentIndex];
    
    // 检查是否有硬性禁忌
    if (selectedHardTaboos.length > 0) {
      // 有硬性禁忌，标记为否决
      this.setData({
        [`posters[${currentIndex}].style`]: 'transform: translateX(-150%) rotate(-20deg)',
        [`posters[${currentIndex}].isVetoed`]: true
      });
      
      const vetoedIndices = [...this.data.vetoedIndices, currentIndex];
      this.setData({ vetoedIndices });
    } else {
      // 普通排除
      this.setData({
        [`posters[${currentIndex}].style`]: 'transform: translateX(-150%) rotate(-20deg)'
      });
    }
    
    this.showUndoBar('left', `海报${currentIndex + 1}`);
    this.nextCard();
  },

  // 右滑 - 选择
  swipeRight() {
    const { currentIndex, posters } = this.data;
    
    this.setData({
      [`posters[${currentIndex}].style`]: 'transform: translateX(150%) rotate(20deg)'
    });
    
    const likedIndices = [...this.data.likedIndices, currentIndex];
    this.setData({ 
      likedIndices,
      canSubmit: likedIndices.length > 0 || this.data.vetoedIndices.length > 0
    });
    
    this.showUndoBar('right', `海报${currentIndex + 1}`);
    this.nextCard();
  },

  // 下一张卡片
  nextCard() {
    const nextIndex = this.data.currentIndex + 1;
    this.setData({ currentIndex: nextIndex });
  },

  // 显示撤销条
  showUndoBar(action, posterName) {
    if (this.data.undoTimer) {
      clearInterval(this.data.undoTimer);
    }
    
    this.setData({
      showUndo: true,
      lastAction: action,
      lastPosterName: posterName,
      undoCountdown: 3
    });
    
    const timer = setInterval(() => {
      const countdown = this.data.undoCountdown - 1;
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ showUndo: false });
      } else {
        this.setData({ undoCountdown: countdown });
      }
    }, 1000);
    
    this.setData({ undoTimer: timer });
  },

  // 撤销操作
  undoLast() {
    if (this.data.undoTimer) {
      clearInterval(this.data.undoTimer);
    }
    
    const { currentIndex, lastAction, likedIndices, vetoedIndices } = this.data;
    const prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) return;
    
    // 恢复卡片
    this.setData({
      [`posters[${prevIndex}].style`]: 'transform: translateX(0) rotate(0)',
      [`posters[${prevIndex}].showScratch`]: false,
      [`posters[${prevIndex}].showPaw`]: false,
      [`posters[${prevIndex}].isVetoed`]: false,
      currentIndex: prevIndex,
      showUndo: false
    });
    
    // 恢复投票数据
    if (lastAction === 'right') {
      this.setData({
        likedIndices: likedIndices.filter(i => i !== prevIndex)
      });
    } else if (lastAction === 'left') {
      this.setData({
        vetoedIndices: vetoedIndices.filter(i => i !== prevIndex)
      });
    }
    
    this.updateCanSubmit();
  },

  updateCanSubmit() {
    const canSubmit = this.data.likedIndices.length > 0 || this.data.vetoedIndices.length > 0;
    this.setData({ canSubmit });
  },

  // 预览海报
  previewPoster(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.posters.map(p => p.imageUrl),
      current: url
    });
  },

  // 切换禁忌展开
  toggleTaboo() {
    this.setData({ tabooExpanded: !this.data.tabooExpanded });
  },

  // 切换硬性禁忌
  toggleHardTaboo(e) {
    const { name } = e.currentTarget.dataset;
    const hardTaboos = this.data.hardTaboos.map(item => {
      if (item.name === name) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    
    const selectedHardTaboos = hardTaboos.filter(i => i.selected).map(i => i.name);
    this.setData({ hardTaboos, selectedHardTaboos });
  },

  // 切换软性偏好
  toggleSoftTaboo(e) {
    const { name } = e.currentTarget.dataset;
    const softTaboos = this.data.softTaboos.map(item => {
      if (item.name === name) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    
    const selectedSoftTaboos = softTaboos.filter(i => i.selected).map(i => i.name);
    this.setData({ softTaboos, selectedSoftTaboos });
  },

  // 设置时间类型
  setTimeType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ timeType: type });
  },

  // 时间选择变化
  onTimeChange(e) {
    const [dayIdx, timeIdx] = e.detail.value;
    const days = this.data.timeRange[0];
    const times = this.data.timeRange[1];
    this.setData({ selectedTime: `${days[dayIdx]} ${times[timeIdx]}` });
  },

  // 请假输入
  onLeaveInput(e) {
    this.setData({ leaveReason: e.detail.value });
  },

  // 弃权
  onWaive() {
    wx.showModal({
      title: '确认弃权',
      content: '确定要放弃本次投票吗？',
      success: (res) => {
        if (res.confirm) {
          this.submitVote({
            posterIndices: [],
            vetoIndices: [],
            status: 'waived'
          });
        }
      }
    });
  },

  // 提交投票
  onSubmit() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请先滑动选择', icon: 'none' });
      return;
    }

    const voteData = {
      posterIndices: this.data.likedIndices,
      vetoIndices: this.data.vetoedIndices,
      hardTaboos: this.data.selectedHardTaboos,
      softTaboos: this.data.selectedSoftTaboos,
      timeInfo: this.data.selectedTime ? {
        type: this.data.timeType,
        datetime: this.data.selectedTime
      } : null,
      leaveInfo: this.data.timeType === 'leave' ? {
        reason: this.data.leaveReason
      } : null,
      status: 'voted'
    };

    this.submitVote(voteData);
  },

  async submitVote(voteData) {
    try {
      wx.showLoading({ title: '提交中' });
      
      const { result } = await wx.cloud.callFunction({
        name: 'submitVote',
        data: {
          roomId: this.data.roomId,
          ...voteData
        }
      });

      if (result.success) {
        wx.hideLoading();
        wx.showToast({ title: '投票成功', icon: 'success' });
        
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/result/result?roomId=${this.data.roomId}`
          });
        }, 1500);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  }
});
