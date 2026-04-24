Page({
  data: {
    userInfo: {
      name: '喵了个鱼用户',
      id: '888888'
    },
    stats: {
      favorites: 0,
      myShops: 0,
      myAppointments: 0,
      myRooms: 0
    },
    // 列表数据
    favorites: [],
    myShops: [],
    myAppointments: [],
    myRooms: [],
    // 当前显示的列表类型
    currentList: '', // 'favorites', 'myShops', 'myAppointments', 'myRooms'
    loading: false
  },

  onShow() {
    // 更新 tabBar 选中状态
    this.updateTabBarSelected();
    // 加载统计数据
    this.loadStats();
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 2 });
    }
  },

  // 加载统计数据
  async loadStats() {
    try {
      // 获取收藏数量
      const favoritesRes = await wx.cloud.callFunction({
        name: 'getFavorites'
      });
      
      // 获取我的店铺数量
      const shopsRes = await wx.cloud.callFunction({
        name: 'getMyShops'
      });
      
      // 获取我的活动数量
      const appointmentsRes = await wx.cloud.callFunction({
        name: 'getMyAppointments'
      });

      // 获取我发起的聚餐数量
      const roomsRes = await wx.cloud.callFunction({
        name: 'getMyRooms'
      });

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

  // 显示我的收藏
  async showFavorites() {
    this.setData({ currentList: 'favorites', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getFavorites'
      });
      if (result.success) {
        this.setData({ 
          favorites: result.favorites,
          loading: false
        });
      }
    } catch (err) {
      console.error('获取收藏失败:', err);
      this.setData({ loading: false });
    }
  },

  // 显示我的店铺
  async showMyShops() {
    this.setData({ currentList: 'myShops', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyShops'
      });
      if (result.success) {
        this.setData({ 
          myShops: result.shops,
          loading: false
        });
      }
    } catch (err) {
      console.error('获取我的店铺失败:', err);
      this.setData({ loading: false });
    }
  },

  // 显示我的活动
  async showMyAppointments() {
    this.setData({ currentList: 'myAppointments', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyAppointments'
      });
      if (result.success) {
        // 格式化时间
        const appointments = result.appointments.map(item => ({
          ...item,
          appointmentTimeStr: this.formatDateTime(item.appointmentTime),
          deadlineStr: this.formatDateTime(item.deadline),
          participantCount: item.participants ? item.participants.length : 0
        }));
        this.setData({ 
          myAppointments: appointments,
          loading: false
        });
      }
    } catch (err) {
      console.error('获取我的活动失败:', err);
      this.setData({ loading: false });
    }
  },

  // 显示我发起的聚餐
  async showMyRooms() {
    this.setData({ currentList: 'myRooms', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyRooms'
      });
      if (result.code === 0) {
        this.setData({ 
          myRooms: result.data,
          loading: false
        });
      }
    } catch (err) {
      console.error('获取我发起的聚餐失败:', err);
      this.setData({ loading: false });
    }
  },

  // 关闭列表
  closeList() {
    this.setData({ currentList: '' });
  },

  // 跳转到店铺详情
  goToShopDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${id}`
    });
  },

  // 跳转到活动详情（店铺详情页）
  goToAppointmentDetail(e) {
    const { shopid } = e.currentTarget.dataset;
    if (shopid) {
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${shopid}`
      });
    }
  },

  // 跳转到聚餐房间详情
  goToRoomDetail(e) {
    const { roomid } = e.currentTarget.dataset;
    if (roomid) {
      wx.navigateTo({
        url: `/pages/control/control?roomId=${roomid}`
      });
    }
  },

  // 删除店铺
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

  // 删除活动
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

  // 取消收藏
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

  // 格式化时间
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
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goToSettings() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goToAbout() {
    wx.showModal({
      title: '关于喵了个鱼',
      content: '版本：v1.0.0\n熟人聚餐决策助手',
      showCancel: false
    });
  }
});
