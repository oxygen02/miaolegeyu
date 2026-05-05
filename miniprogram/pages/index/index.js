const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

// 鱼的配置
const FISH_COUNT = 5;
const FISH_COLORS = [
  { body: 'linear-gradient(135deg, #87CEEB 0%, #ADD8E6 50%, #87CEEB 100%)', tail: '#ADD8E6', fin: '#ADD8E6' },
  { body: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 50%, #FFB6C1 100%)', tail: '#FFC0CB', fin: '#FFC0CB' },
  { body: 'linear-gradient(135deg, #98E4D6 0%, #B2F0E8 50%, #98E4D6 100%)', tail: '#B2F0E8', fin: '#B2F0E8' },
  { body: 'linear-gradient(135deg, #FFE66D 0%, #FFF0A0 50%, #FFE66D 100%)', tail: '#FFF0A0', fin: '#FFF0A0' },
  { body: 'linear-gradient(135deg, #A8E6CF 0%, #C8F7E8 50%, #A8E6CF 100%)', tail: '#C8F7E8', fin: '#C8F7E8' }
];

Page({
  data: {
    recentRooms: [],
    scaredFish: null,
    touchIndex: null,
    appointmentBanners: [],
    countdownTimers: {},
    pageReady: false,
    _dataLoaded: false,
    imagePaths: imagePaths,
    fishes: []
  },

  // 鱼的动画实例和状态（由 wx.createAnimation 驱动）
  _fishAnims: [],
  _fishStates: [],

  touchStartX: 0,
  touchStartY: 0,
  isTouchMoved: false,

  onLoad(options) {
    setTimeout(() => {
      this.setData({ pageReady: true });
      this._loadDataAsync();
      this._initFishes();
    }, 200);
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
    this.clearAllTimers();
    this._stopAllFishAnimations();
  },

  onHide() {
    this.clearAllTimers();
    this._stopAllFishAnimations();
  },

  onShow() {
    this.updateTabBarSelected();
    if (this.data._dataLoaded) {
      this._loadDataAsync();
    }
    if (this.data.fishes.length > 0) {
      this._resumeFishAnimations();
    }
  },

  clearAllTimers() {
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });
    this.setData({ countdownTimers: {} });
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
          posterUrl: room.candidatePosters?.[0]?.imageUrl || imagePaths.banners.taiyakiIcon
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
        const now = new Date().getTime();
        let appointments = result.appointments
          .map(app => {
            let deadlineTime = 0;
            if (app.deadline) {
              let dateStr = app.deadline;
              dateStr = dateStr.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '');
              dateStr = dateStr.replace(/\//g, '-');
              deadlineTime = new Date(dateStr).getTime();
              if (isNaN(deadlineTime)) {
                const parts = app.deadline.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
                if (parts) {
                  deadlineTime = new Date(parts[1], parts[2]-1, parts[3]).getTime();
                }
              }
            }
            const remainingTime = deadlineTime > now ? deadlineTime - now : 0;
            return { ...app, remainingTime };
          })
          .filter(app => app.remainingTime > 0)
          .map(app => ({
            ...app,
            countdownText: this.formatCountdown(app.remainingTime),
            appointmentTimeStr: this.formatAppointmentTime(app.appointmentTime),
            cuisineName: app.cuisineName || this.getCuisineName(app.cuisine),
            location: app.location || app.shopLocation || '地址待定',
            shopImage: app.shopImage || app.shopImages?.[0] || imagePaths.decorations.loveCatIcon
          }));
        if (appointments.length > 4) {
          appointments = this.shuffleArray(appointments).slice(0, 4);
        }
        this.setData({ appointmentBanners: appointments });
        this.startCountdowns(appointments);
      } else {
        this.setData({ appointmentBanners: [] });
      }
    } catch (err) {
      this.setData({ appointmentBanners: [] });
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
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const month = (beijingDate.getUTCMonth() + 1 < 10 ? '0' : '') + (beijingDate.getUTCMonth() + 1);
    const day = (beijingDate.getUTCDate() < 10 ? '0' : '') + beijingDate.getUTCDate();
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

  goCreate() {
    audioManager.playMeowShort();
    wx.navigateTo({ url: '/pages/create/create' });
  },
  goJoin() {
    audioManager.playMeowShort();
    wx.navigateTo({ url: '/pages/room-list/room-list' });
  },
  goFishTank() {
    audioManager.playMeowShort();
    wx.navigateTo({ url: '/pages/create-group-order/create-group-order' });
  },
  goFoodDiscovery() {
    audioManager.playMeowShort();
    wx.navigateTo({ url: '/pages/food-discovery/food-discovery' });
  },

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
    audioManager.playPawTap();
    wx.navigateTo({ url: `/pages/vote/vote?roomId=${id}` });
  },

  viewAllRecent() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onBannerTap(e) {
    const { type, appointmentId } = e.currentTarget.dataset;
    if (appointmentId) {
      wx.navigateTo({ url: `/pages/vote/vote?roomId=${appointmentId}` });
      return;
    }
    switch(type) {
      case 'food': wx.navigateTo({ url: '/pages/food-discovery/food-discovery' }); break;
      case 'activity': wx.navigateTo({ url: '/pages/fish-tank/fish-tank' }); break;
      case 'night': wx.showToast({ title: '深夜食堂即将开启', icon: 'none' }); break;
    }
  },

  // ==================== 鱼触碰逃逸（wx.createAnimation 驱动）====================
  onFishTap(e) {
    const { fish } = e.currentTarget.dataset;
    const fishIndex = parseInt(fish) - 1;

    if (this.data.scaredFish === fish) return;

    const state = this._fishStates[fishIndex];
    if (!state || state.escaping) return;

    const { clientX } = e.detail;
    const { windowWidth } = wx.getWindowInfo();
    const tapFromLeft = clientX < windowWidth / 2;

    // 震动反馈
    wx.vibrateShort({ type: 'medium' });

    // 停止当前游泳动画
    this._stopFishAnimation(fishIndex);

    // 进入逃逸状态
    state.escaping = true;
    state.escapeDirection = tapFromLeft ? 1 : -1;
    this.setData({ scaredFish: fish });

    // 使用 wx.createAnimation 创建逃逸动画
    this._playEscapeAnimation(fishIndex, state.escapeDirection);

    // 5.2 秒后重置
    setTimeout(() => {
      this._resetFish(fishIndex);
      this.setData({ scaredFish: null });
    }, 5200);
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
  },

  // ==================== wx.createAnimation 鱼动画系统 ====================

  _initFishes() {
    const fishes = [];
    this._fishAnims = [];
    this._fishStates = [];

    for (let i = 0; i < FISH_COUNT; i++) {
      const state = this._createFishState(i);
      this._fishStates.push(state);

      // 创建动画实例
      const anim = wx.createAnimation({
        duration: 0,
        timingFunction: 'linear',
        delay: 0
      });
      this._fishAnims.push(anim);

      fishes.push(this._stateToData(state, i, anim));
    }

    this.setData({ fishes }, () => {
      // 数据渲染完成后启动游泳动画
      this._startAllSwimAnimations();
    });
  },

  _createFishState(index) {
    const goingRight = Math.random() > 0.5;
    const top = 5 + Math.random() * 80;
    const duration = 20000 + Math.random() * 15000; // 20~35秒横穿

    return {
      index,
      top: top + '%',
      direction: goingRight ? 'right' : 'left',
      // 游泳参数
      swimDuration: duration,
      swimDelay: Math.random() * 5000,
      // 逃逸参数
      escaping: false,
      escapeDirection: 0,
      ...FISH_COLORS[index]
    };
  },

  _stateToData(state, index, animInstance) {
    return {
      index,
      top: state.top,
      // 绑定动画对象
      animation: animInstance ? animInstance.export() : {},
      direction: state.direction,
      // 朝向由 wx.createAnimation 的 scaleX 控制，不再使用 CSS flipClass
      ...FISH_COLORS[index]
    };
  },

  // 启动所有鱼的游泳动画
  _startAllSwimAnimations() {
    this._fishStates.forEach((state, i) => {
      if (!state.escaping) {
        this._startSwimAnimation(i);
      }
    });
  },

  // 恢复页面显示时的动画
  _resumeFishAnimations() {
    this._startAllSwimAnimations();
  },

  // 停止所有鱼动画
  _stopAllFishAnimations() {
    this._fishStates.forEach((state, i) => {
      this._stopFishAnimation(i);
    });
  },

  // 停止单条鱼的动画（保留当前 transform，只停止位移）
  _stopFishAnimation(index) {
    const anim = this._fishAnims[index];
    const state = this._fishStates[index];
    if (anim && state) {
      // 保留当前 scaleX 朝向，避免停止后出现倒着游
      const isLTR = state.direction === 'right';
      const scaleX = isLTR ? -1 : 1;
      anim.scaleX(scaleX).step({ duration: 0 });
      this._updateFishAnim(index);
    }
  },

  // 启动单条鱼的游泳动画
  _startSwimAnimation(index) {
    const state = this._fishStates[index];
    const anim = this._fishAnims[index];
    if (!state || !anim || state.escaping) return;

    const isLTR = state.direction === 'right';
    const startX = isLTR ? -15 : 115;
    const endX = isLTR ? 115 : -15;
    const scaleX = isLTR ? -1 : 1; // LTR 鱼需要翻转，头朝右

    // 初始位置 + 朝向
    anim.left(startX + '%').scaleX(scaleX).step({ duration: 0 });
    this._updateFishAnim(index);

    // 延迟后开始游泳
    setTimeout(() => {
      if (this._fishStates[index] && !this._fishStates[index].escaping) {
        anim.left(endX + '%').scaleX(scaleX).step({
          duration: state.swimDuration,
          timingFunction: 'linear'
        });
        this._updateFishAnim(index);

        // 游完后重新初始化
        setTimeout(() => {
          if (this._fishStates[index] && !this._fishStates[index].escaping) {
            this._resetFish(index);
          }
        }, state.swimDuration);
      }
    }, state.swimDelay);
  },

  // 播放逃逸动画
  _playEscapeAnimation(index, direction) {
    const anim = this._fishAnims[index];
    if (!anim) return;

    // 获取鱼的当前位置（从 data 中读取）
    const currentFish = this.data.fishes[index];
    const currentLeft = currentFish ? parseFloat(currentFish.animation?.left || 50) : 50;

    const isRight = direction > 0;
    const targetX = isRight ? 130 : -30;
    const escapeScaleX = isRight ? -1 : 1; // 向右逃→翻转头朝右，向左逃→不翻头朝左

    // 阶段1：受惊僵直（0.3s，几乎不动）+ 立即转向
    anim.left(currentLeft + '%').scaleX(escapeScaleX).step({
      duration: 300,
      timingFunction: 'ease-out'
    });
    this._updateFishAnim(index);

    // 阶段2：犹豫缓游（0.7s，移动少量）
    setTimeout(() => {
      const hesitateX = isRight ? currentLeft + 5 : currentLeft - 5;
      anim.left(hesitateX + '%').scaleX(escapeScaleX).step({
        duration: 700,
        timingFunction: 'ease-in-out'
      });
      this._updateFishAnim(index);
    }, 300);

    // 阶段3：缓游起步（1.5s）
    setTimeout(() => {
      const swimX = isRight ? currentLeft + 20 : currentLeft - 20;
      anim.left(swimX + '%').scaleX(escapeScaleX).step({
        duration: 1500,
        timingFunction: 'ease-in-out'
      });
      this._updateFishAnim(index);
    }, 1000);

    // 阶段4：逐渐加速（1.5s）
    setTimeout(() => {
      const rushX = isRight ? currentLeft + 50 : currentLeft - 50;
      anim.left(rushX + '%').scaleX(escapeScaleX).step({
        duration: 1500,
        timingFunction: 'ease-in'
      });
      this._updateFishAnim(index);
    }, 2500);

    // 阶段5：全速冲刺（1.2s）
    setTimeout(() => {
      anim.left(targetX + '%').scaleX(escapeScaleX).step({
        duration: 1200,
        timingFunction: 'ease-in'
      });
      this._updateFishAnim(index);
    }, 4000);
  },

  // 更新单条鱼的动画到视图
  _updateFishAnim(index) {
    const anim = this._fishAnims[index];
    if (!anim) return;

    const exportData = anim.export();
    this.setData({
      [`fishes[${index}].animation`]: exportData
    });
  },

  // 重置单条鱼
  _resetFish(index) {
    const state = this._createFishState(index);
    this._fishStates[index] = state;

    const anim = this._fishAnims[index];
    if (anim) {
      // 根据新方向立即设置正确朝向，避免重置后出现倒着游
      const isLTR = state.direction === 'right';
      const scaleX = isLTR ? -1 : 1;
      anim.scaleX(scaleX).step({ duration: 0 });
    }

    const newData = this._stateToData(state, index, anim);
    this.setData({
      [`fishes[${index}]`]: newData
    }, () => {
      // 重置后立即启动新的游泳动画
      setTimeout(() => {
        this._startSwimAnimation(index);
      }, 100);
    });
  }
});
