Page({
  data: {
    userInfo: {
      nickName: '',
      avatarUrl: '',
      userId: '',
      isLogin: false
    },
    stats: {
      favorites: 0,
      myShops: 0,
      myAppointments: 0,
      myRooms: 0
    },
    favorites: [],
    myShops: [],
    myAppointments: [],
    myRooms: [],
    currentList: '',
    loading: false
  },

  onLoad() {
    // 页面加载时检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    this.updateTabBarSelected();
    if (this.data.userInfo.isLogin) {
      this.loadStats();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      // 尝试从本地存储获取用户信息
      const localUserInfo = wx.getStorageSync('userInfo');
      if (localUserInfo && localUserInfo.isLogin) {
        this.setData({
          userInfo: localUserInfo
        });
        this.loadStats();
      } else {
        // 未登录，显示默认状态
        this.setData({
          userInfo: {
            nickName: '点击登录',
            avatarUrl: '',
            userId: '',
            isLogin: false
          }
        });
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  },

  // 微信登录
  async wxLogin() {
    if (this.data.userInfo.isLogin) {
      // 已登录，显示操作菜单
      this.showUserMenu();
      return;
    }

    wx.showLoading({ title: '登录中...' });

    try {
      // 获取微信用户信息
      const { userInfo: wxUserInfo } = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });

      // 调用云函数登录
      const { result } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          nickName: wxUserInfo.nickName,
          avatarUrl: wxUserInfo.avatarUrl,
          isCustom: false
        }
      });

      wx.hideLoading();

      if (result.code === 0) {
        const userInfo = {
          ...result.data,
          isLogin: true
        };

        // 保存到本地存储
        wx.setStorageSync('userInfo', userInfo);

        this.setData({ userInfo });
        this.loadStats();

        wx.showToast({ title: '登录成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.msg || '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  // 显示用户菜单（已登录时点击头像）
  showUserMenu() {
    wx.showActionSheet({
      itemList: ['修改昵称', '更换头像', '退出登录'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.editNickName();
            break;
          case 1:
            this.changeAvatar();
            break;
          case 2:
            this.logout();
            break;
        }
      }
    });
  },

  // 修改昵称
  editNickName() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '更新中...' });

          try {
            const { result } = await wx.cloud.callFunction({
              name: 'updateUserInfo',
              data: { nickName: res.content }
            });

            wx.hideLoading();

            if (result.code === 0) {
              const userInfo = {
                ...this.data.userInfo,
                nickName: res.content
              };
              wx.setStorageSync('userInfo', userInfo);
              this.setData({ userInfo });
              wx.showToast({ title: '修改成功', icon: 'success' });
            } else {
              wx.showToast({ title: result.msg || '修改失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '修改失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 更换头像
  changeAvatar() {
    wx.navigateTo({
      url: '/pages/avatar-select/avatar-select?mode=profile'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userInfo');

          this.setData({
            userInfo: {
              nickName: '点击登录',
              avatarUrl: '',
              userId: '',
              isLogin: false
            },
            stats: {
              favorites: 0,
              myShops: 0,
              myAppointments: 0,
              myRooms: 0
            }
          });

          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 2 });
    }
  },

  async loadStats() {
    if (!this.data.userInfo.isLogin) return;

    try {
      const favoritesRes = await wx.cloud.callFunction({ name: 'getFavorites' });
      const shopsRes = await wx.cloud.callFunction({ name: 'getMyShops' });
      const appointmentsRes = await wx.cloud.callFunction({ name: 'getMyAppointments' });
      const roomsRes = await wx.cloud.callFunction({ name: 'getMyRooms' });

      this.setData({
        stats: {
          favorites: favoritesRes.result.count || 0,
          myShops: shopsRes.result.count || 0,
          myAppointments: appointmentsRes.result.count || 0,
          myRooms: roomsRes.result.code === 0 ? roomsRes.result.data.length : 0
        }
      });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  async showFavorites() {
    if (!this.checkLogin()) return;
    this.setData({ currentList: 'favorites', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getFavorites' });
      if (result.success) {
        this.setData({ favorites: result.favorites, loading: false });
      }
    } catch (err) {
      console.error('获取收藏失败:', err);
      this.setData({ loading: false });
    }
  },

  async showMyShops() {
    if (!this.checkLogin()) return;
    this.setData({ currentList: 'myShops', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getMyShops' });
      if (result.success) {
        this.setData({ myShops: result.shops, loading: false });
      }
    } catch (err) {
      console.error('获取我的店铺失败:', err);
      this.setData({ loading: false });
    }
  },

  async showMyAppointments() {
    if (!this.checkLogin()) return;
    this.setData({ currentList: 'myAppointments', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getMyAppointments' });
      if (result.success) {
        const appointments = result.appointments.map(item => ({
          ...item,
          appointmentTimeStr: this.formatDateTime(item.appointmentTime),
          deadlineStr: this.formatDateTime(item.deadline),
          participantCount: item.participants ? item.participants.length : 0
        }));
        this.setData({ myAppointments: appointments, loading: false });
      }
    } catch (err) {
      console.error('获取我的活动失败:', err);
      this.setData({ loading: false });
    }
  },

  async showMyRooms() {
    if (!this.checkLogin()) return;
    this.setData({ currentList: 'myRooms', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getMyRooms' });
      if (result.code === 0) {
        this.setData({ myRooms: result.data, loading: false });
      }
    } catch (err) {
      console.error('获取我发起的聚餐失败:', err);
      this.setData({ loading: false });
    }
  },

  checkLogin() {
    if (!this.data.userInfo.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            this.wxLogin();
          }
        }
      });
      return false;
    }
    return true;
  },

  closeList() {
    this.setData({ currentList: '' });
  },

  goToShopDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${id}` });
  },

  goToAppointmentDetail(e) {
    const { shopid } = e.currentTarget.dataset;
    if (shopid) {
      wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${shopid}` });
    }
  },

  goToRoomDetail(e) {
    const { roomid } = e.currentTarget.dataset;
    if (roomid) {
      wx.navigateTo({ url: `/pages/control/control?roomId=${roomid}` });
    }
  },

  async deleteShop(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个店铺吗？',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'deleteShop',
          data: { shopId: id }
        });
        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.showMyShops();
          this.loadStats();
        } else {
          wx.showToast({ title: result.error || '删除失败', icon: 'none' });
        }
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    }
  },

  async deleteAppointment(e) {
    const { id } = e.currentTarget.dataset;
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个活动吗？',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'deleteDiningAppointment',
          data: { appointmentId: id }
        });
        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.showMyAppointments();
          this.loadStats();
        } else {
          wx.showToast({ title: result.error || '删除失败', icon: 'none' });
        }
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    }
  },

  async cancelFavorite(e) {
    const { id, type } = e.currentTarget.dataset;
    try {
      wx.showLoading({ title: '取消中...' });
      const { result } = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { targetId: id, type }
      });
      wx.hideLoading();
      if (result.success && !result.isFavorited) {
        wx.showToast({ title: '已取消收藏', icon: 'success' });
        this.showFavorites();
        this.loadStats();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  preventBubble() {
    // 阻止事件冒泡
  }
});
