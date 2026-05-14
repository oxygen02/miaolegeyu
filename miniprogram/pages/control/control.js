const ANON_NAMES = ['吃货喵', '馋嘴猫', '干饭喵', '探店喵', '觅食喵', '品鉴喵', '寻味喵', '尝鲜喵', '老饕喵', '滋味喵'];
const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
    roomId: '',
    bannerCatUrl: imagePaths.misc.juzeAvatar,
    roomCode: '731286',
    roomTitle: '周二晚撸串建设北路',
    roomAddress: '建设北路',
    roomTime: '4月28日 18:00',
    voteDeadline: '',
    roomStatus: 'voting',
    statusText: '投票中',
    isAnonymous: false,
    countdown: '00:00:00',
    countdownTimer: null,
    pollTimer: null,
    votedCount: 3,
    unvotedCount: 2,
    progressPercent: 60,
    participants: [
      { id: 'o001', nickName: '喵不喵', avatarUrl: imagePaths.misc.juzeAvatar, isVoted: true, isHost: true, anonName: '吃货喵', choices: ['经典川菜', '重庆火锅'] },
      { id: 'o002', nickName: '吃货小王', avatarUrl: imagePaths.misc.juzeAvatar, isVoted: true, isHost: false, anonName: '馋嘴猫', choices: ['重庆火锅'] },
      { id: 'o003', nickName: '美食家小李', avatarUrl: imagePaths.misc.juzeAvatar, isVoted: true, isHost: false, anonName: '干饭喵', choices: ['经典川菜', '麻辣香锅'] },
      { id: 'o004', nickName: '橘仔', avatarUrl: imagePaths.misc.juzeAvatar, isVoted: false, isHost: false, anonName: '探店喵', choices: [] },
      { id: 'o005', nickName: '匿名喵友', avatarUrl: imagePaths.misc.juzeAvatar, isVoted: false, isHost: false, anonName: '觅食喵', choices: [] }
    ],
    topOptions: [
      { id: 'sub_01_01', name: '经典川菜', image: imagePaths.banners.taiyakiIcon, count: 3, percent: 75 },
      { id: 'sub_01_02', name: '重庆火锅', image: imagePaths.banners.taiyakiIcon, count: 2, percent: 50 },
      { id: 'sub_10_02', name: '麻辣香锅', image: imagePaths.banners.taiyakiIcon, count: 2, percent: 50 }
    ],
    winner: {
      name: '味记小渔匠肥肠鱼稻田蛙',
      address: '东郊记忆店',
      category: '川菜',
      price: 68,
      image: imagePaths.banners.taiyakiIcon,
      voteCount: 4,
      votePercent: 80
    }
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
          roomCode: room.code || this.data.roomCode
        });
        
        this.calculateStats(participants);
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
    const statusMap = { voting: '投票中', locked: '已锁定', cancelled: '已取消', ended: '已结束' };
    this.setData({ statusText: statusMap[this.data.roomStatus] || '未知' });
  },

  toggleAnonymous() {
    this.setData({ isAnonymous: !this.data.isAnonymous });
  },

  copyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => { wx.showToast({ title: '已复制', icon: 'success' }); }
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
        content: participant.isVoted ? '已完成投票' : '等待投票中',
        showCancel: false
      });
    }
  },

  remindMember(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '催一下',
      content: '是否发送提醒消息？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已发送提醒', icon: 'success' });
        }
      }
    });
  },

  editRoom() {
    wx.navigateTo({ url: `/pages/edit-room/edit-room?roomId=${this.data.roomId}` });
  },

  lockResult() {
    if (this.data.roomStatus === 'locked') return;
    wx.showModal({
      title: '确认锁定',
      content: '锁定后将无法修改投票结果，确定继续？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '锁定中...' });
          setTimeout(() => {
            wx.hideLoading();
            this.setData({ roomStatus: 'locked', statusText: '已锁定' });
            wx.showToast({ title: '已锁定', icon: 'success' });
          }, 1000);
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