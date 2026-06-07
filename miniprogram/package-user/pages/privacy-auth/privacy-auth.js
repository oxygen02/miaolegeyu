const app = getApp();

Page({
  data: {
    imagePaths: {},
    // 授权状态
    friendAuthorized: false,
    locationAuthorized: false,
    citySelected: false,
    selectedCity: null,
    // 显示状态
    showCityPicker: false,
    // 授权文本
    friendAuthStatus: 'pending',
    friendAuthText: '未授权',
    locationAuthStatus: 'pending',
    locationAuthText: '未授权'
  },

  onLoad() {
    this.setData({
      imagePaths: app.globalData.imagePaths
    });
    this.checkAuthStatus();
  },

  // 检查授权状态
  async checkAuthStatus() {
    try {
      // 检查好友授权（通过本地存储）
      const friendAuth = wx.getStorageSync('friendAuth');
      if (friendAuth) {
        this.setData({
          friendAuthorized: true,
          friendAuthStatus: 'authorized',
          friendAuthText: '已授权'
        });
      }

      // 检查地理位置授权
      const locationAuth = wx.getStorageSync('locationAuth');
      const userCity = wx.getStorageSync('userCity');
      if (locationAuth && userCity) {
        this.setData({
          locationAuthorized: true,
          locationAuthStatus: 'authorized',
          locationAuthText: '已授权',
          citySelected: true,
          selectedCity: userCity
        });
      }
    } catch (err) {
      console.error('检查授权状态失败:', err);
    }
  },

  // 授权好友关系
  async authorizeFriends() {
    try {
      wx.showLoading({ title: '请求授权...' });

      // 1. 获取同玩好友（使用微信客户端 API）
      let gameFriends = [];
      try {
        // wx.getFriendCloudStorage 可以获取也玩过本小程序的好友
        const friendData = await wx.getFriendCloudStorage({
          keyList: ['score', 'level'] // 可以传入任意 key，主要是获取好友列表
        });
        if (friendData && friendData.data) {
          gameFriends = friendData.data.map(item => item.openid).filter(Boolean);
        }
      } catch (err) {
        console.log('获取同玩好友失败（可能无同玩好友）:', err);
        // 同玩好友获取失败不影响整体流程
      }

      // 2. 同步好友关系到后端
      const { result: friendResult } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          action: 'syncFriends',
          gameFriends: gameFriends
        }
      });

      if (friendResult.success) {
        const allFriends = friendResult.friendOpenids || [];

        // 保存到本地
        wx.setStorageSync('friendAuth', true);
        wx.setStorageSync('friendOpenids', allFriends);

        this.setData({
          friendAuthorized: true,
          friendAuthStatus: 'authorized',
          friendAuthText: `已授权 (${allFriends.length}位好友)`
        });

        wx.showToast({ title: '授权成功', icon: 'success' });
      } else {
        throw new Error(friendResult.error || '授权失败');
      }
    } catch (err) {
      console.error('好友授权失败:', err);
      wx.showModal({
        title: '授权提示',
        content: '好友关系授权需要您同意。您也可以稍后在"我的-设置"中授权。',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 授权地理位置
  async authorizeLocation() {
    try {
      const { authSetting } = await wx.getSetting();
      
      if (!authSetting['scope.userLocation']) {
        // 未授权，请求授权
        const { confirm } = await wx.showModal({
          title: '地理位置授权',
          content: '我们需要获取您的位置信息来确定所在城市，用于展示同城活动。',
          confirmText: '去授权',
          cancelText: '暂不'
        });

        if (!confirm) return;

        // 打开设置页面
        await wx.openSetting();
        return;
      }

      // 已授权
      wx.setStorageSync('locationAuth', true);
      this.setData({
        locationAuthorized: true,
        locationAuthStatus: 'authorized',
        locationAuthText: '已授权'
      });

    } catch (err) {
      console.error('地理位置授权失败:', err);
      wx.showToast({ title: '授权失败', icon: 'none' });
    }
  },

  // 自动定位城市
  async autoLocateCity() {
    try {
      wx.showLoading({ title: '定位中...' });

      const { latitude, longitude } = await wx.getLocation({
        type: 'gcj02'
      });

      // 调用逆地理编码
      const { result } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          action: 'reverseGeocode',
          latitude,
          longitude
        }
      });

      if (result.success) {
        const cityData = {
          country: result.country,
          countryCode: result.countryCode,
          region: result.region,
          city: result.city,
          cityCode: result.cityCode,
          isDomestic: result.isDomestic,
          source: 'auto'
        };

        wx.setStorageSync('userCity', cityData);

        this.setData({
          citySelected: true,
          selectedCity: cityData
        });

        wx.showToast({ title: '定位成功', icon: 'success' });
      } else {
        throw new Error(result.error || '定位失败');
      }
    } catch (err) {
      console.error('自动定位失败:', err);
      wx.showModal({
        title: '定位失败',
        content: '无法获取当前位置，请手动选择城市',
        showCancel: false
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 手动选择城市（搜索模式）
  manualSelectCity() {
    this.setData({ showCityPicker: true });
  },

  // 城市选择确认
  async onCityConfirm(e) {
    const cityData = e.detail;

    // 保存到本地
    wx.setStorageSync('userCity', cityData);

    this.setData({
      showCityPicker: false,
      citySelected: true,
      selectedCity: cityData
    });

    // 同步城市信息到后端数据库
    try {
      await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          action: 'syncCity',
          city: cityData
        }
      });
      console.log('城市信息已同步到后端');
    } catch (err) {
      console.error('同步城市信息失败:', err);
    }

    // 如果是通过定位获取的，标记位置授权
    if (cityData.source === 'auto') {
      wx.setStorageSync('locationAuth', true);
    }
  },

  // 城市选择取消
  onCityCancel() {
    this.setData({ showCityPicker: false });
  },

  // 修改城市
  changeCity() {
    this.setData({
      citySelected: false,
      selectedCity: null
    });
    wx.removeStorageSync('userCity');
  },

  // 跳过授权
  skipAuth() {
    wx.showModal({
      title: '提示',
      content: '暂不授权将导致：\n• 无法看到好友的活动\n• 无法看到同城活动\n• 只能通过分享链接参与活动\n\n您之后可以在"我的-设置"中开启授权。',
      confirmText: '仍要跳过',
      cancelText: '去授权',
      success: (res) => {
        if (res.confirm) {
          // 标记为已跳过
          wx.setStorageSync('authSkipped', true);
          this.enterApp();
        }
      }
    });
  },

  // 进入小程序
  enterApp() {
    // 检查是否至少授权了一项
    if (!this.data.friendAuthorized && !this.data.locationAuthorized) {
      wx.showToast({
        title: '请至少授权一项',
        icon: 'none'
      });
      return;
    }

    // 如果授权了位置但没选城市
    if (this.data.locationAuthorized && !this.data.citySelected) {
      wx.showToast({
        title: '请选择城市',
        icon: 'none'
      });
      return;
    }

    // 标记已完成授权流程
    wx.setStorageSync('privacyAuthCompleted', true);

    // 跳转到首页
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 计算属性：是否可以进入
  canEnter() {
    const { friendAuthorized, locationAuthorized, citySelected } = this.data;
    // 至少授权一项，且如果授权了位置必须选了城市
    if (!friendAuthorized && !locationAuthorized) return false;
    if (locationAuthorized && !citySelected) return false;
    return true;
  }
});