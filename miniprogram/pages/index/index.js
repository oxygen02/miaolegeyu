Page({
  data: {
    recentRooms: [],
    scaredFish: null,
    scaredFishDirection: null,
    touchIndex: null,
    // 约饭活动轮播数据
    appointmentBanners: [],
    countdownTimers: {}
  },

  // 触摸相关状态（不放入data避免触发渲染）
  touchStartX: 0,
  touchStartY: 0,
  isTouchMoved: false,

  onLoad() {
    this.loadRecentRooms();
    this.loadAppointmentBanners();
  },

  onShow() {
    // 使用 setTimeout 延迟加载，避免阻塞页面切换
    setTimeout(() => {
      this.loadRecentRooms();
      this.loadAppointmentBanners();
    }, 100);
  },

  onUnload() {
    // 清除倒计时定时器
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });
  },

  async loadRecentRooms() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getRecentRooms',
        data: { limit: 10 }
      });
      if (result.success) {
        const rooms = result.rooms.map(room => ({
          ...room,
          statusText: this.getStatusText(room.status),
          posterUrl: room.candidatePosters?.[0]?.imageUrl || '/assets/images/default-poster.png'
        }));
        this.setData({ recentRooms: rooms });
      }
    } catch (err) {
      console.log('加载最近活动失败', err);
    }
  },

  // 加载约饭活动轮播数据
  async loadAppointmentBanners() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { limit: 10 }
      });
      
      if (result.success && result.appointments) {
        // 只显示未截止的
        let appointments = result.appointments
          .filter(app => app.remainingTime > 0)
          .map(app => ({
            ...app,
            countdownText: this.formatCountdown(app.remainingTime),
            appointmentTimeStr: this.formatAppointmentTime(app.appointmentTime)
          }));
        
        // 如果超过4条，随机抽取4条
        if (appointments.length > 4) {
          appointments = this.shuffleArray(appointments).slice(0, 4);
        }
        
        this.setData({ appointmentBanners: appointments });
        
        // 启动倒计时
        this.startCountdowns(appointments);
      }
    } catch (err) {
      console.error('加载约饭活动失败:', err);
    }
  },

  // 数组随机打乱
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  // 格式化倒计时
  formatCountdown(remainingTime) {
    if (remainingTime <= 0) return '已截止';

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return '即将截止';
    }
  },

  // 格式化约饭时间
  formatAppointmentTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    return `${month}/${day}`;
  },

  // 启动倒计时
  startCountdowns(appointments) {
    // 清除旧定时器
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });

    const timers = {};
    appointments.forEach(app => {
      if (app.remainingTime > 0) {
        timers[app._id] = setInterval(() => {
          app.remainingTime -= 1000;
          
          if (app.remainingTime <= 0) {
            clearInterval(timers[app._id]);
            this.loadAppointmentBanners(); // 刷新数据
          } else {
            // 更新倒计时显示
            const banners = this.data.appointmentBanners.map(banner => {
              if (banner._id === app._id) {
                return {
                  ...banner,
                  countdownText: this.formatCountdown(app.remainingTime)
                };
              }
              return banner;
            });
            this.setData({ appointmentBanners: banners });
          }
        }, 60000); // 每分钟更新一次
      }
    });

    this.setData({ countdownTimers: timers });
  },

  getStatusText(status) {
    const map = {
      'voting': '投票中',
      'locked': '已结束',
      'cancelled': '已取消'
    };
    return map[status] || status;
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/create/create' });
  },

  goJoin() {
    wx.navigateTo({ url: '/pages/join/join' });
  },

  goFishTank() {
    wx.navigateTo({ url: '/pages/fish-tank/fish-tank' });
  },

  goFoodDiscovery() {
    wx.navigateTo({ url: '/pages/food-discovery/food-discovery' });
  },

  enterRoom(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/vote/vote?roomId=${id}` });
  },

  viewAllRecent() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onBannerTap(e) {
    const { type, appointmentId } = e.currentTarget.dataset;
    
    if (appointmentId) {
      // 点击约饭活动轮播，进入详情页
      wx.navigateTo({ 
        url: `/pages/appointment-detail/appointment-detail?id=${appointmentId}` 
      });
      return;
    }
    
    switch(type) {
      case 'food':
        wx.navigateTo({ url: '/pages/food-discovery/food-discovery' });
        break;
      case 'activity':
        wx.navigateTo({ url: '/pages/fish-tank/fish-tank' });
        break;
      case 'night':
        wx.showToast({ title: '深夜食堂即将开启', icon: 'none' });
        break;
    }
  },

  // 触碰小鱼时的处理
  onFishTouch(e) {
    const { fish } = e.currentTarget.dataset;

    // 如果这条鱼已经在快速游走，忽略
    if (this.data.scaredFish === fish) return;

    // 获取点击位置
    const { clientX } = e.touches[0];

    // 获取屏幕宽度
    const { windowWidth } = wx.getSystemInfoSync();

    // 判断点击位置：靠近左边界还是右边界
    // 如果点击位置在屏幕左半边，鱼向左游；右半边则向右游
    const swimDirection = clientX < windowWidth / 2 ? 'left' : 'right';

    // 震动反馈
    wx.vibrateShort({ type: 'light' });

    // 设置这条鱼为受惊状态，并记录游走方向
    this.setData({
      scaredFish: fish,
      scaredFishDirection: swimDirection
    });

    // 动画结束后恢复原有动画
    setTimeout(() => {
      this.setData({
        scaredFish: null,
        scaredFishDirection: null
      });
    }, 3000);
  },

  // 触摸开始
  onTouchStart(e) {
    const { index } = e.currentTarget.dataset;
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isTouchMoved = false;
    this.setData({ touchIndex: index });
  },

  // 触摸移动
  onTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);

    // 如果移动距离超过10rpx，认为是滑动而非点击
    if (deltaX > 10 || deltaY > 10) {
      this.isTouchMoved = true;
      this.setData({ touchIndex: null });
    }
  },

  // 触摸结束
  onTouchEnd(e) {
    this.setData({ touchIndex: null });
  }
});
