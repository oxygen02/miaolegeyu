Page({
  data: {
    recentRooms: [],
    scaredFish: null,
    scaredFishDirection: null,
    touchIndex: null,
    appointmentBanners: [],
    countdownTimers: {},
    pageReady: false,
    _dataLoaded: false
  },

  touchStartX: 0,
  touchStartY: 0,
  isTouchMoved: false,

  onLoad(options) {
    setTimeout(() => {
      this.setData({ pageReady: true });
      this._loadDataAsync();
    }, 200);
  },

  onShow() {
    // 更新 tabBar 选中状态为首页
    this.updateTabBarSelected();
    if (this.data._dataLoaded) {
      this._loadDataAsync();
    }
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 0 });
    }
  },

  _loadDataAsync() {
    if (this._loading) return;
    this._loading = true;
    setTimeout(() => {
      this.loadRecentRooms();
      this.loadAppointmentBanners();
      this._loading = false;
      this.setData({ _dataLoaded: true });
    }, 500);
  },

  onUnload() {
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });
  },

  async loadRecentRooms() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getRecentRooms',
        data: { limit: 5 }
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

  async loadAppointmentBanners() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { limit: 5 }
      });

      if (result.success && result.appointments) {
        let appointments = result.appointments
          .filter(app => app.remainingTime > 0)
          .map(app => ({
            ...app,
            countdownText: this.formatCountdown(app.remainingTime),
            appointmentTimeStr: this.formatAppointmentTime(app.appointmentTime),
            cuisineName: app.cuisineName || this.getCuisineName(app.cuisine),
            location: app.location || app.shopLocation || '地址待定',
            shopImage: app.shopImage || app.shopImages?.[0] || '/assets/images/love-cat-icon.png'
          }));

        if (appointments.length > 4) {
          appointments = this.shuffleArray(appointments).slice(0, 4);
        }

        this.setData({ appointmentBanners: appointments });
        this.startCountdowns(appointments);
      }
    } catch (err) {
      console.error('加载约饭活动失败:', err);
    }
  },

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  getCuisineName(cuisineId) {
    const cuisineMap = {
      'chinese': '中餐', 'japanese': '日韩餐', 'western': '西餐',
      'bbq': '烧烤', 'hotpot': '火锅', 'meat': '烤肉',
      'seafood': '海鲜', 'crayfish': '小龙虾', 'local': '地方特色',
      'dessert': '甜品', 'tea': '奶茶', 'cafe': '咖啡',
      'bar': '酒吧', 'snack': '大排档'
    };
    return cuisineMap[cuisineId] || '美食';
  },

  formatCountdown(remainingTime) {
    if (remainingTime <= 0) return '已截止';
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}时${minutes}分`;
    if (minutes > 0) return `${minutes}分钟`;
    return '即将截止';
  },

  formatAppointmentTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    return `${month}/${day}`;
  },

  async joinAppointment(appointment) {
    try {
      wx.showLoading({ title: '报名中...' });
      const { result } = await wx.cloud.callFunction({
        name: 'joinDiningAppointment',
        data: { appointmentId: appointment._id }
      });
      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: '报名成功', icon: 'success' });
        this.loadAppointmentBanners();
      } else {
        wx.showToast({ title: result.message || '报名失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('报名失败:', err);
      wx.showToast({ title: '报名失败', icon: 'none' });
    }
  },

  startCountdowns(appointments) {
    Object.values(this.data.countdownTimers).forEach(timer => clearInterval(timer));
    const timers = {};
    appointments.forEach(app => {
      if (app.remainingTime > 0) {
        timers[app._id] = setInterval(() => {
          app.remainingTime -= 1000;
          if (app.remainingTime <= 0) {
            clearInterval(timers[app._id]);
            this.loadAppointmentBanners();
          } else {
            const banners = this.data.appointmentBanners.map(banner => {
              if (banner._id === app._id) {
                return { ...banner, countdownText: this.formatCountdown(app.remainingTime) };
              }
              return banner;
            });
            this.setData({ appointmentBanners: banners });
          }
        }, 60000);
      }
    });
    this.setData({ countdownTimers: timers });
  },

  getStatusText(status) {
    const map = { 'voting': '投票中', 'locked': '已结束', 'cancelled': '已取消' };
    return map[status] || status;
  },

  goCreate() { wx.navigateTo({ url: '/pages/create/create' }); },
  goJoin() { 
    // 跳转到房间列表页面
    wx.navigateTo({ url: '/pages/room-list/room-list' }); 
  },
  goFishTank() {
    // 直接进入发起拼单页面
    wx.navigateTo({ url: '/pages/create-group-order/create-group-order' });
  },
  goFoodDiscovery() { wx.navigateTo({ url: '/pages/food-discovery/food-discovery' }); },

  // 底部导航切换
  switchTab(e) {
    const { index } = e.currentTarget.dataset;
    const urlMap = {
      '0': '/pages/index/index',
      '1': '/pages/fish-tank/fish-tank',
      '2': '/pages/profile/profile'
    };
    const url = urlMap[index];
    if (url && index !== '0') {
      wx.switchTab({ url });
    }
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
      wx.navigateTo({ url: `/pages/appointment-detail/appointment-detail?id=${appointmentId}` });
      return;
    }
    switch(type) {
      case 'food': wx.navigateTo({ url: '/pages/food-discovery/food-discovery' }); break;
      case 'activity': wx.navigateTo({ url: '/pages/fish-tank/fish-tank' }); break;
      case 'night': wx.showToast({ title: '深夜食堂即将开启', icon: 'none' }); break;
    }
  },

  onFishTap(e) {
    const { fish } = e.currentTarget.dataset;
    if (this.data.scaredFish === fish) return;

    const { clientX } = e.detail;
    const { windowWidth } = wx.getSystemInfoSync();
    const swimDirection = clientX < windowWidth / 2 ? 'left' : 'right';

    wx.vibrateShort({ type: 'light' });

    this.setData({
      scaredFish: fish,
      scaredFishDirection: swimDirection
    });

    setTimeout(() => {
      this.setData({
        scaredFish: null,
        scaredFishDirection: null
      });
    }, 1500);
  },

  onTouchStart(e) {
    const { index } = e.currentTarget.dataset;
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.isTouchMoved = false;
    this.setData({ touchIndex: index });
  },

  onTouchMove(e) {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);
    if (deltaX > 10 || deltaY > 10) {
      this.isTouchMoved = true;
      this.setData({ touchIndex: null });
    }
  },

  onTouchEnd(e) {
    this.setData({ touchIndex: null });
  }
});
