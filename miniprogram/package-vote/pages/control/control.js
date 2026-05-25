const ANON_NAMES = ['吃货喵', '馋嘴猫', '干饭喵', '探店喵', '觅食喵', '品鉴喵', '寻味喵', '尝鲜喵', '老饕喵', '滋味喵'];
const { imagePaths } = getApp().globalData;
const { CONTROL_TEXTS } = require('../../utils/i18n');

Page({
  data: {
    imagePaths: imagePaths,
    roomId: '',
    bannerCatUrl: imagePaths.misc.juzeAvatar,
    roomCode: '',
    roomTitle: '',
    roomAddress: '',
    roomTime: '',
    voteDeadline: '',
    roomStatus: 'voting',
    statusText: '投票中',
    isAnonymous: false,
    countdown: '00:00:00',
    countdownTimer: null,
    pollTimer: null,
    votedCount: 0,
    unvotedCount: 0,
    progressPercent: 0,
    participants: [],
    topOptions: [],
    winner: null,
    isLoading: true
  },

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    if (!src) return;
    wx.previewImage({ current: src, urls: [src] });
  },

  parseDeadline(deadlineValue) {
    if (!deadlineValue) {
      return null;
    }
    
    let deadline;
    
    if (typeof deadlineValue === 'string') {
      if (deadlineValue.includes('月') && deadlineValue.includes('日')) {
        const now = new Date();
        const year = now.getFullYear();
        const monthMatch = deadlineValue.match(/(\d+)月/);
        const dayMatch = deadlineValue.match(/(\d+)日/);
        const hourMatch = deadlineValue.match(/(\d+):(\d{2})/);
        
        if (!monthMatch || !dayMatch) {
          return null;
        }
        
        const month = parseInt(monthMatch[1]) - 1;
        const day = parseInt(dayMatch[1]);
        const hour = hourMatch ? parseInt(hourMatch[1]) : 23;
        const minute = hourMatch ? parseInt(hourMatch[2]) : 59;
        
        deadline = new Date(year, month, day, hour, minute, 0, 0);
        
        if (deadline.getTime() < now.getTime()) {
          deadline = new Date(year + 1, month, day, hour, minute, 0, 0);
        }
      } else {
        deadline = new Date(deadlineValue);
      }
    } else if (typeof deadlineValue === 'number') {
      deadline = new Date(deadlineValue);
    } else {
      return null;
    }
    
    if (isNaN(deadline.getTime())) {
      return null;
    }
    
    return deadline.getTime();
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    this.setData({ roomId });
    
    const deadline = this.parseDeadline(this.data.roomTime);
    if (deadline) {
      this.setData({ voteDeadline: deadline });
    }
    
    this.startCountdown();
    this.calculateStats(this.data.participants);
    
    if (roomId && wx.cloud) {
      this.fetchRoomData(roomId);
    }
  },

  onUnload() { this.clearAllTimers(); },
  onHide() { this.clearAllTimers(); },

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

        // 使用服务端返回的统计数据
        const stats = room.stats || {};
        const votedCount = stats.votedCount !== undefined ? stats.votedCount : participants.filter(p => p.isVoted).length;
        const unvotedCount = stats.unvotedCount !== undefined ? stats.unvotedCount : (participants.length - votedCount);
        const progressPercent = stats.progressPercent !== undefined ? stats.progressPercent : (participants.length > 0 ? Math.round((votedCount / participants.length) * 100) : 0);

        // 使用服务端返回的topOptions
        const topOptions = (room.topOptions || []).map(opt => ({
          ...opt,
          image: opt.image || imagePaths.banners.taiyakiIcon
        }));

        let deadline = null;
        if (room.deadline) {
          deadline = this.parseDeadline(room.deadline);
        } else if (room.time) {
          deadline = this.parseDeadline(room.time);
        }

        this.setData({
          roomTitle: room.title || '',
          roomAddress: room.location || '',
          roomTime: room.time || '',
          voteDeadline: deadline || '',
          roomStatus: room.status || 'voting',
          isAnonymous: isAnon,
          participants: participants,
          bannerCatUrl: room.creatorAvatarUrl || imagePaths.misc.juzeAvatar,
          roomCode: room.code || this.data.roomCode,
          votedCount,
          unvotedCount,
          progressPercent,
          topOptions,
          isLoading: false
        });

        this.updateStatusText();
        this.startCountdown();
      }
    }).catch(err => {
      console.error('获取房间数据失败:', err);
    });
  },

  calculateStats(participants) {
    const votedCount = participants.filter(p => p.isVoted).length;
    const unvotedCount = participants.length - votedCount;
    const progressPercent = participants.length > 0 ? Math.round((votedCount / participants.length) * 100) : 0;
    this.setData({ votedCount, unvotedCount, progressPercent });
  },

  startCountdown() {
    this.stopCountdown();
    
    let targetTime;
    
    if (this.data.voteDeadline) {
      targetTime = typeof this.data.voteDeadline === 'string' 
        ? new Date(this.data.voteDeadline).getTime() 
        : this.data.voteDeadline;
    } else if (this.data.roomTime) {
      targetTime = this.parseDeadline(this.data.roomTime);
    }
    
    if (!targetTime || isNaN(targetTime)) {
      targetTime = Date.now() + 2 * 60 * 60 * 1000;
      console.log('[倒计时] 未设置截止时间，使用默认值（当前+2小时）');
    }
    
    if (targetTime <= Date.now()) {
      this.setData({ countdown: '00:00:00' });
      return;
    }
    
    this.updateCountdown(targetTime);
    this.data.countdownTimer = setInterval(() => {
      this.updateCountdown(targetTime);
    }, 1000);
  },

  stopCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.data.countdownTimer = null;
    }
  },

  updateCountdown(targetTime) {
    const now = Date.now();
    const diff = targetTime - now;
    
    if (diff <= 0) {
      this.setData({ countdown: '00:00:00' });
      this.stopCountdown();
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    this.setData({
      countdown: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    });
  },

  startPolling() {
    this.stopPolling();
    this.data.pollTimer = setInterval(() => {
      if (this.data.roomId && wx.cloud) {
        this.fetchRoomData(this.data.roomId);
      }
    }, 15000);
  },

  stopPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.data.pollTimer = null;
    }
  },

  clearAllTimers() {
    this.stopCountdown();
    this.stopPolling();
  },

  updateStatusText() {
    this.setData({ statusText: CONTROL_TEXTS.statusMap[this.data.roomStatus] || '未知' });
  },

  toggleAnonymous() {
    const newValue = !this.data.isAnonymous;
    this.setData({ isAnonymous: newValue });
    // 同步到服务端
    if (this.data.roomId && wx.cloud) {
      wx.cloud.callFunction({
        name: 'updateRoom',
        data: {
          roomId: this.data.roomId,
          isAnonymous: newValue
        }
      }).then(res => {
        if (res.result && res.result.code === 0) {
          wx.showToast({ title: newValue ? CONTROL_TEXTS.toast.anonymousOn : CONTROL_TEXTS.toast.anonymousOff, icon: 'success' });
        } else {
          wx.showToast({ title: res.result?.msg || CONTROL_TEXTS.toast.settingFailed, icon: 'none' });
          // 回滚本地状态
          this.setData({ isAnonymous: !newValue });
        }
      }).catch(err => {
        console.error('同步匿名状态失败:', err);
        wx.showToast({ title: CONTROL_TEXTS.toast.settingFailed, icon: 'none' });
        // 回滚本地状态
        this.setData({ isAnonymous: !newValue });
      });
    }
  },

  copyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => { wx.showToast({ title: CONTROL_TEXTS.toast.copied, icon: 'success' }); }
    });
  },

  shareRoom() {
    wx.showShareMenu({ withShareTicket: true });
  },

  handleMemberTap(e) {
    const index = e.currentTarget.dataset.index;
    const participant = this.data.participants[index];
    if (!this.data.isAnonymous || !participant.isVoted) {
      wx.showModal({
        title: participant.nickName,
        content: participant.isVoted ? CONTROL_TEXTS.modal.memberVoted : CONTROL_TEXTS.modal.memberUnvoted,
        showCancel: false
      });
    }
  },

  remindMember(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: CONTROL_TEXTS.modal.remindTitle,
      content: CONTROL_TEXTS.modal.remindContent,
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: CONTROL_TEXTS.toast.remindSent, icon: 'success' });
        }
      }
    });
  },

  editRoom() {
    if (this.data.roomStatus === 'ended') {
      wx.showToast({ title: CONTROL_TEXTS.toast.editExpired, icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/package-create/pages/create-mode-a/create-mode-a?edit=true&roomId=${this.data.roomId}` });
  },

  lockResult() {
    if (this.data.roomStatus === 'locked' || this.data.roomStatus === 'ended') return;
    wx.showModal({
      title: CONTROL_TEXTS.modal.lockTitle,
      content: CONTROL_TEXTS.modal.lockContent,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: CONTROL_TEXTS.loading.locking });
          // 调用云函数锁定房间
          wx.cloud.callFunction({
            name: 'lockRoom',
            data: {
              roomId: this.data.roomId
            }
          }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.code === 0) {
              this.setData({ roomStatus: 'locked', statusText: CONTROL_TEXTS.statusMap.locked });
              wx.showToast({ title: CONTROL_TEXTS.toast.locked, icon: 'success' });
            } else {
              wx.showToast({ title: res.result?.msg || CONTROL_TEXTS.toast.lockFailed, icon: 'none' });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('锁定失败:', err);
            wx.showToast({ title: CONTROL_TEXTS.toast.lockFailed, icon: 'none' });
          });
        }
      }
    });
  },

  shareToFriends() {
    wx.showShareMenu({ withShareTicket: true });
  },

  getShareInfo() {
    return {
      title: this.data.roomTitle,
      path: `/pages/control/control?roomId=${this.data.roomId}`,
      imageUrl: imagePaths.misc.juzeAvatar
    };
  }
});