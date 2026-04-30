const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

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
      myRooms: 0,
      myParticipated: 0
    },
    // 游戏化积分系统
    userPoints: {
      total: 128,
      fishCoins: 56,
      level: 3,
      levelName: '资深喵友',
      nextLevelNeed: 200
    },
    favorites: [],
    myShops: [],
    myAppointments: [],
    myRooms: [],
    myParticipated: [],
    currentList: '',
    loading: false,
    imagePaths: imagePaths
  },

  onLoad() {
    // 获取云存储文件的临时 URL
    this.loadCloudImageUrls();
    // 页面加载时检查登录状态
    this.checkLoginStatus();
  },

  // 获取云存储图片的临时访问 URL
  async loadCloudImageUrls() {
    try {
      // 收集所有需要转换的云存储路径
      const cloudPaths = [];
      const pathMap = {};

      // 收集 icons 路径
      Object.keys(imagePaths.icons).forEach(key => {
        const path = imagePaths.icons[key];
        if (path && path.startsWith('cloud://')) {
          cloudPaths.push(path);
          pathMap[path] = { category: 'icons', key };
        }
      });

      if (cloudPaths.length === 0) return;

      // 调用云函数获取临时 URL
      const { result } = await wx.cloud.callFunction({
        name: 'getTempFileURL',
        data: { fileList: cloudPaths }
      });

      if (result && result.fileList) {
        const newImagePaths = { ...this.data.imagePaths };

        result.fileList.forEach(item => {
          const mapping = pathMap[item.fileID];
          if (mapping && item.tempFileURL) {
            newImagePaths[mapping.category][mapping.key] = item.tempFileURL;
          }
        });

        this.setData({ imagePaths: newImagePaths });
        console.log('Cloud images loaded:', newImagePaths.icons);
      }
    } catch (err) {
      console.error('获取云存储图片 URL 失败:', err);
    }
  },

  onLoad() {
    // 页面加载时检查登录状态
    this.checkLoginStatus();
  },

  onShow() {
    this.updateTabBarSelected();
    if (this.data.userInfo.isLogin) {
      this.loadStats();
      // 如果当前显示的是我发起的聚餐列表，刷新数据
      if (this.data.currentList === 'myRooms') {
        this.loadMyRooms();
      }
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

  // 登录入口 - 提供两种登录方式选择
  async wxLogin() {
    if (this.data.userInfo.isLogin) {
      // 已登录，显示操作菜单
      this.showUserMenu();
      return;
    }

    // 显示登录方式选择
    wx.showActionSheet({
      itemList: ['快速体验（随机昵称）', '自定义昵称和头像'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 方式一：快速体验，自动生成随机昵称
          this.quickLogin();
        } else if (res.tapIndex === 1) {
          // 方式二：先选择头像昵称，再登录
          this.customLogin();
        }
      }
    });
  },

  // 方式一：快速体验登录
  quickLogin() {
    wx.showLoading({ title: '登录中...' });

    const defaultUserInfo = {
      nickName: '喵友' + Math.floor(Math.random() * 10000),
      avatarUrl: ''
    };

    this.doLogin(defaultUserInfo);
  },

  // 方式二：自定义登录 - 先跳转到信息填写页
  customLogin() {
    // 跳转到自定义登录页
    wx.navigateTo({
      url: '/pages/avatar-select/avatar-select?mode=login'
    });
  },

  // 获取用户信息（兼容旧版调用）
  getUserInfo() {
    this.quickLogin();
  },

  // 执行登录
  async doLogin(userInfo) {
    try {
      // 调用云函数登录
      const { result } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          isCustom: false
        }
      });

      wx.hideLoading();

      if (result.code === 0) {
        const userData = {
          ...result.data,
          isLogin: true
        };

        // 保存到本地存储
        wx.setStorageSync('userInfo', userData);

        this.setData({ userInfo: userData });
        this.loadStats();

        wx.showToast({ title: '登录成功', icon: 'success' });

        // 提示用户
        setTimeout(() => {
          wx.showModal({
            title: '欢迎喵~',
            content: `您的昵称是「${userData.nickName}」，点击头像可随时修改昵称和头像`,
            showCancel: false,
            confirmText: '知道了'
          });
        }, 1500);
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
      console.log('开始加载统计数据...');
      
      // 使用 Promise.allSettled 避免一个失败影响其他
      const results = await Promise.allSettled([
        wx.cloud.callFunction({ name: 'getFavorites' }),
        wx.cloud.callFunction({ name: 'getMyShops' }),
        wx.cloud.callFunction({ name: 'getMyAppointments' }),
        wx.cloud.callFunction({ name: 'getMyRooms' }),
        wx.cloud.callFunction({ name: 'getMyParticipatedRooms' })
      ]);

      console.log('云函数返回结果:', results);

      // 安全获取数据长度
      const getCount = (result, dataKey = 'data') => {
        if (result.status !== 'fulfilled') {
          console.log(`  -> ${dataKey} rejected:`, result.reason);
          return 0;
        }
        const res = result.value;
        if (!res || !res.result) {
          console.log(`  -> ${dataKey} no result`);
          return 0;
        }
        if (res.result.code !== undefined && res.result.code !== 0) {
          console.log(`  -> ${dataKey} code error:`, res.result.code);
          return 0;
        }
        if (res.result.count !== undefined) {
          return res.result.count;
        }
        if (res.result[dataKey]) {
          return Array.isArray(res.result[dataKey]) ? res.result[dataKey].length : 0;
        }
        return 0;
      };

      const stats = {
        favorites: getCount(results[0], 'favorites'),
        myShops: getCount(results[1], 'shops'),
        myAppointments: getCount(results[2], 'appointments'),
        myRooms: getCount(results[3], 'data'),
        myParticipated: getCount(results[4], 'data')
      };
      
      console.log('最终 stats:', stats);
      
      this.setData({ stats });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  async showFavorites() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'favorites', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getFavorites' });
      if (result.success) {
        const favorites = result.favorites.map(item => {
          // 根据类型提取展示数据
          if (item.type === 'shop' && item.shop) {
            return {
              ...item,
              displayName: item.shop.name || '未知店铺',
              displayImage: item.shop.images && item.shop.images[0] || item.imageUrl || '',
              displayDesc: item.shop.address || item.shop.location || '暂无地址',
              displayRating: item.shop.rating || '',
              displayPrice: item.shop.averagePrice || item.shop.price || '',
              createTimeStr: this.formatDateTime(item.createTime)
            };
          } else if (item.type === 'appointment' && item.appointment) {
            return {
              ...item,
              displayName: item.appointment.shopName || '未知活动',
              displayImage: item.appointment.shopImage || item.appointment.imageUrl || item.imageUrl || '',
              displayDesc: item.appointment.location || item.appointment.address || '暂无地点',
              displayRating: '',
              displayPrice: '',
              createTimeStr: this.formatDateTime(item.createTime)
            };
          }
          // 兜底处理
          return {
            ...item,
            displayName: item.name || '未知项目',
            displayImage: item.imageUrl || '',
            displayDesc: '暂无描述',
            displayRating: '',
            displayPrice: '',
            createTimeStr: this.formatDateTime(item.createTime)
          };
        });
        this.setData({ favorites, loading: false });
      }
    } catch (err) {
      console.error('获取收藏失败:', err);
      this.setData({ loading: false });
    }
  },

  async showMyShops() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
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
    audioManager.playPawTap();
    this.setData({ currentList: 'myAppointments', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getMyAppointments' });
      if (result.success) {
        const appointments = result.appointments.map(item => {
          // 解析预约时间
          const appointmentDate = item.appointmentTime ? new Date(item.appointmentTime) : null;
          const deadlineDate = item.deadline ? new Date(item.deadline) : null;

          return {
            ...item,
            appointmentTimeStr: this.formatDateTime(item.appointmentTime),
            deadlineStr: this.formatDateTime(item.deadline),
            participantCount: item.participants ? item.participants.length : 0,
            // 分离日期和时间
            appointmentDate: appointmentDate ? this.formatDate(appointmentDate) : '',
            appointmentTime: appointmentDate ? this.formatTime(appointmentDate) : '',
            // 地点信息
            location: item.location || item.address || '',
            // 店铺图片
            shopImage: item.shopImage || item.imageUrl || ''
          };
        });
        this.setData({ myAppointments: appointments, loading: false });
      }
    } catch (err) {
      console.error('获取我的活动失败:', err);
      this.setData({ loading: false });
    }
  },

  async showMyRooms() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'myRooms', loading: true });
    await this.loadMyRooms();
  },

  // 显示我参与的聚餐列表
  async showMyParticipated() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'myParticipated', loading: true });
    await this.loadMyParticipated();
  },

  // 加载我参与的聚餐列表
  async loadMyParticipated() {
    this.setData({ loading: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getMyParticipatedRooms' });
      if (result.code === 0) {
        // 处理数据，添加格式化字段
        const participated = result.data.map(item => {
          // 格式化 voteDeadline
          let voteDeadlineStr = '';
          if (item.voteDeadline) {
            const date = new Date(item.voteDeadline);
            if (!isNaN(date.getTime())) {
              const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
              const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
              const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
              const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
              voteDeadlineStr = `${month}-${day} ${hour}:${minute}`;
            }
          }

          return {
            ...item,
            voteDeadlineStr
          };
        });
        this.setData({ myParticipated: participated, loading: false });
      }
    } catch (err) {
      console.error('获取我参与的聚餐失败:', err);
      this.setData({ loading: false });
    }
  },

  // 加载我发起的聚餐列表
  async loadMyRooms() {
    this.setData({ loading: true });
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

  // 点击管理按钮
  onManageTap(e) {
    // 使用 catchtap 阻止冒泡，不需要调用 stopPropagation
    const { roomid } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['编辑', '删除', '分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.editRoom(roomid);
        } else if (res.tapIndex === 1) {
          this.deleteRoom(roomid);
        } else if (res.tapIndex === 2) {
          this.shareRoom(roomid);
        }
      }
    });
  },

  // 点击活动管理按钮
  onManageAppointmentTap(e) {
    // 使用 catchtap 阻止冒泡
    const { id } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['查看', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查找对应的活动获取 shopId
          const appointment = this.data.myAppointments.find(item => item._id === id);
          if (appointment && appointment.shopId) {
            wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${appointment.shopId}` });
          }
        } else if (res.tapIndex === 1) {
          this.deleteAppointment({ currentTarget: { dataset: { id } } });
        }
      }
    });
  },

  // 点击收藏项进入详情
  goToFavoriteDetail(e) {
    const { item } = e.currentTarget.dataset;
    if (item.type === 'shop' && item.targetId) {
      wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${item.targetId}` });
    } else if (item.type === 'appointment' && item.targetId) {
      wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${item.targetId}` });
    }
  },

  // 点击取消收藏按钮
  onCancelFavoriteTap(e) {
    // 使用 catchtap 阻止冒泡
    const { id, type } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消收藏吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          this.cancelFavorite({ currentTarget: { dataset: { id, type } } });
        }
      }
    });
  },

  // 分享房间
  shareRoom(roomId) {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 长按房间显示操作菜单
  onRoomLongPress(e) {
    const { roomid, iscreator } = e.currentTarget.dataset;
    const itemList = iscreator ? ['编辑', '删除'] : ['取消参与'];

    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (iscreator) {
          // 房主操作
          if (res.tapIndex === 0) {
            this.editRoom(roomid);
          } else if (res.tapIndex === 1) {
            this.deleteRoom(roomid);
          }
        } else {
          // 参与者操作
          if (res.tapIndex === 0) {
            this.quitRoom(roomid);
          }
        }
      }
    });
  },

  // 编辑房间
  editRoom(roomId) {
    wx.navigateTo({
      url: `/pages/create/create?mode=edit&roomId=${roomId}`
    });
  },

  // 删除房间（房主）
  async deleteRoom(roomId) {
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个聚餐吗？删除后不可恢复',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'deleteRoom',
          data: { roomId }
        });
        if (result.code === 0) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.showMyRooms();
          this.loadStats();
        } else {
          wx.showToast({ title: result.msg || '删除失败', icon: 'none' });
        }
      } catch (err) {
        wx.showToast({ title: '删除失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
    }
  },

  // 取消参与（参与者）
  async quitRoom(roomId) {
    const res = await wx.showModal({
      title: '确认取消',
      content: '确定要取消参与这个聚餐吗？',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '处理中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'quitRoom',
          data: { roomId }
        });
        if (result.code === 0) {
          wx.showToast({ title: '已取消参与', icon: 'success' });
          // 刷新列表
          if (this.data.currentList === 'myRooms') {
            this.showMyRooms();
          }
          this.loadStats();
        } else {
          wx.showToast({ title: result.msg || '操作失败', icon: 'none' });
        }
      } catch (err) {
        wx.showToast({ title: '操作失败', icon: 'none' });
      } finally {
        wx.hideLoading();
      }
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

  formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    return `${year}-${month}-${day}`;
  },

  formatTime(date) {
    if (!date) return '';
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return `${hour}:${minute}`;
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
