/**
 * 个人中心页面
 * 功能：展示用户信息、登录/登出、统计概览、收藏/店铺/聚餐/房间列表管理
 * 登录方式：微信登录、快速体验（随机昵称）、自定义登录（头像+昵称选择页）
 */
const audioManager = require('../../utils/audioManager');
const auth = require('../../utils/auth');
const { imagePaths } = require('../../config/imageConfig');

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
      myParticipated: 0,
      myScheduleVotes: 0
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
    myScheduleVotes: [],
    currentList: '',
    loading: false,
    imagePaths: imagePaths
  },

  onLoad() {
    this.loadCloudImageUrls();
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

  onShow() {
    // 每次页面显示时，重新检查登录状态（解决从设置页面退出登录后返回不刷新的问题）
    this.checkLoginStatus();
    this.updateTabBarSelected();
    if (this.data.userInfo.isLogin) {
      this.loadStats();
      // 如果当前显示的是我发起的聚餐列表，刷新数据
      if (this.data.currentList === 'myRooms') {
        this.loadMyRooms();
      }
      // 如果当前显示的是时间投票列表，刷新数据
      if (this.data.currentList === 'myScheduleVotes') {
        this.showMyScheduleVotes();
      }
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const localUserInfo = auth.getUserInfo();
    if (localUserInfo && localUserInfo.isLogin) {
      this.setData({ userInfo: localUserInfo });
      this.loadStats();
    } else {
      this.setData({
        userInfo: {
          nickName: '点击登录',
          avatarUrl: '',
          userId: '',
          isLogin: false
        }
      });
    }
  },

  // 登录入口
  wxLogin() {
    if (this.data.userInfo.isLogin) {
      this.showUserMenu();
      return;
    }
    auth.showLoginOptions((userInfo) => {
      this.setData({ userInfo });
      this.loadStats();
    });
  },

  // 微信登录直接入口
  wechatLoginDirect() {
    this.wechatLogin();
  },

  // 快速体验直接入口
  quickLoginDirect() {
    this.quickLogin();
  },

  // 快速体验登录
  quickLogin() {
    wx.showLoading({ title: '登录中...' });
    const randomNames = ['橘喵', '胖橘', '三花', '狸花', '布偶', '英短', '美短', '暹罗', '缅因', '波斯', '金渐层', '银渐层', '蓝猫', '黑猫', '白猫'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const defaultUserInfo = {
      nickName: randomName + Math.floor(Math.random() * 10000),
      avatarUrl: ''
    };
    this.doLogin(defaultUserInfo);
  },

  // 微信一键登录
  wechatLogin() {
    wx.showLoading({ title: '登录中...' });

    // 调用 wx.login 获取 code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 使用 getUserProfile 获取用户信息（新版推荐方式）
          wx.getUserProfile({
            desc: '用于完善用户资料',
            success: (profileRes) => {
              const userInfo = {
                nickName: profileRes.userInfo.nickName,
                avatarUrl: profileRes.userInfo.avatarUrl,
                code: loginRes.code
              };
              this.doWechatLogin(userInfo);
            },
            fail: (err) => {
              wx.hideLoading();
              console.log('获取用户信息失败:', err);
              // 用户拒绝授权，降级为快速体验
              wx.showModal({
                title: '提示',
                content: '需要获取您的昵称和头像用于展示，您可以选择快速体验模式',
                confirmText: '快速体验',
                cancelText: '取消',
                success: (res) => {
                  if (res.confirm) {
                    this.quickLogin();
                  }
                }
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '登录失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '登录失败', icon: 'none' });
      }
    });
  },

  // 微信登录执行
  async doWechatLogin(userInfo) {
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
        auth.setUserInfo(userData);

        this.setData({ userInfo: userData });
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

  // 自定义登录
  customLogin() {
    wx.navigateTo({
      url: '/pages/avatar-select/avatar-select?mode=login'
    });
  },

  // 兼容旧版调用
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

        auth.setUserInfo(userData);
        this.setData({ userInfo: userData });
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
            auth.setUserInfo(userInfo);
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
    auth.logout(() => {
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
          myRooms: 0,
          myParticipated: 0,
          myScheduleVotes: 0
        },
        myScheduleVotes: []
      });
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
        wx.cloud.callFunction({ name: 'getMyParticipatedRooms' }),
        wx.cloud.callFunction({ name: 'getMyScheduleVotes', data: { mode: 'all', limit: 100 } })
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
        myParticipated: getCount(results[4], 'data'),
        myScheduleVotes: getCount(results[5], 'votes')
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

  async showMyScheduleVotes() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'myScheduleVotes', loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyScheduleVotes',
        data: { mode: 'all', limit: 100 }
      });
      if (result.success) {
        const votes = result.votes.map(vote => {
          const dateStr = vote.candidateDates?.length > 0
            ? vote.candidateDates.map(d => {
                const parts = d.split('-');
                return `${parts[1]}/${parts[2]}`;
              }).join('、')
            : '时间待定';

          let deadlineStr = '';
          if (vote.deadline) {
            const d = new Date(vote.deadline);
            if (!isNaN(d.getTime())) {
              const month = (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1);
              const day = (d.getDate() < 10 ? '0' : '') + d.getDate();
              const hour = (d.getHours() < 10 ? '0' : '') + d.getHours();
              const minute = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
              deadlineStr = `${month}-${day} ${hour}:${minute}`;
            }
          }

          return {
            ...vote,
            dateStr,
            deadlineStr,
            roleText: vote.isCreator ? '发起人' : '参与者',
            statusText: vote.isExpired ? '已截止' : '进行中'
          };
        });
        this.setData({ myScheduleVotes: votes, loading: false });
      }
    } catch (err) {
      console.error('获取时间投票失败:', err);
      this.setData({ loading: false });
    }
  },

  goToScheduleVoteDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/schedule-vote/result/result?id=${id}`
    });
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
            voteDeadlineStr,
            ...this.calcDeadlineUrgent(item.voteDeadline)
          };
        });
        this.setData({ myParticipated: participated, loading: false });
        // 启动倒计时定时器
        this.startProfileDeadlineTimer('myParticipated');
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
        const formattedRooms = (result.data || []).map(room => {
          if (room.voteDeadline) {
            const date = new Date(room.voteDeadline);
            if (!isNaN(date.getTime())) {
              const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
              const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
              const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
              const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
              room.voteDeadlineStr = `${month}-${day} ${hour}:${minute}`;
            }
          }
          // 打印字段信息用于调试模式判断
          console.log('房间字段:', room.roomId, 'dinnerTime:', room.dinnerTime, 'candidatePosters:', room.candidatePosters);
          return {
            ...room,
            ...this.calcDeadlineUrgent(room.voteDeadline)
          };
        });
        this.setData({ myRooms: formattedRooms, loading: false });
        // 启动倒计时定时器
        this.startProfileDeadlineTimer('myRooms');
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

  // 计算截止时间紧急状态（≤1小时返回红色标记和倒计时文字）
  calcDeadlineUrgent(voteDeadline) {
    const now = Date.now();
    const ONE_HOUR = 3600000;
    let deadlineUrgent = false;
    let deadlineCountdown = '';

    if (voteDeadline) {
      try {
        const deadline = new Date(voteDeadline).getTime();
        if (!isNaN(deadline)) {
          const diff = deadline - now;
          if (diff > 0 && diff <= ONE_HOUR) {
            deadlineUrgent = true;
            const minutes = Math.ceil(diff / 60000);
            if (minutes >= 60) {
              const h = Math.floor(diff / 3600000);
              const m = Math.floor((diff % 3600000) / 60000);
              deadlineCountdown = `剩${h}时${m}分`;
            } else {
              deadlineCountdown = `剩${minutes}分`;
            }
          } else if (diff <= 0) {
            deadlineUrgent = true;
            deadlineCountdown = '已截止';
          }
        }
      } catch (e) {
        // 解析失败忽略
      }
    }

    return { deadlineUrgent, deadlineCountdown };
  },

  // 启动 profile 页面的截止时间倒计时定时器
  startProfileDeadlineTimer(listKey) {
    this.clearProfileDeadlineTimer();
    this._profileDeadlineListKey = listKey;
    this._profileDeadlineTimer = setInterval(() => {
      const listData = this.data[listKey];
      if (listData && listData.length > 0) {
        const updatedList = listData.map(item => ({
          ...item,
          ...this.calcDeadlineUrgent(item.voteDeadline)
        }));
        this.setData({ [listKey]: updatedList });
      }
    }, 60000); // 每分钟更新一次
  },

  clearProfileDeadlineTimer() {
    if (this._profileDeadlineTimer) {
      clearInterval(this._profileDeadlineTimer);
      this._profileDeadlineTimer = null;
    }
  },

  onHide() {
    this.clearProfileDeadlineTimer();
  },

  onUnload() {
    this.clearProfileDeadlineTimer();
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

  // 分享房间 - 记录待分享的房间ID，提示用户使用右上角分享
  shareRoom(roomId) {
    this.setData({ _shareRoomId: roomId });
    wx.showToast({
      title: '请点击右上角 ··· 分享',
      icon: 'none',
      duration: 2000
    });
  },

  // 分享给朋友（页面生命周期钩子）
  onShareAppMessage() {
    const roomId = this.data._shareRoomId;
    if (roomId) {
      const room = [...(this.data.myRooms || []), ...(this.data.myParticipated || [])]
        .find(r => r.roomId === roomId);
      return {
        title: room ? `「${room.title || '聚餐投票'}」快来一起选餐厅！` : '快来一起选餐厅！',
        path: `/pages/vote/vote?roomId=${roomId}`,
        imageUrl: room?.finalPoster || (room?.candidatePosters?.[0]?.imageUrl) || ''
      };
    }
    // 默认分享
    return {
      title: '喵了个鱼 - 聚餐投票神器',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const roomId = this.data._shareRoomId;
    if (roomId) {
      const room = [...(this.data.myRooms || []), ...(this.data.myParticipated || [])]
        .find(r => r.roomId === roomId);
      return {
        title: room ? `「${room.title || '聚餐投票'}」快来一起选餐厅！` : '喵了个鱼 - 聚餐投票神器',
        query: `roomId=${roomId}`,
        imageUrl: room?.finalPoster || ''
      };
    }
    return {
      title: '喵了个鱼 - 聚餐投票神器'
    };
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
    // 查找房间信息以确定模式
    const room = this.data.myRooms.find(r => r.roomId === roomId);
    const mode = room ? room.mode : '';

    console.log('编辑房间:', roomId, '找到房间:', room, 'mode:', mode);

    // 将房间数据存储到本地，供编辑页面使用
    if (room) {
      wx.setStorageSync('editRoomData', room);
    }

    // 根据模式跳转到对应的编辑页面
    // 优先使用 mode 字段判断：
    // - 模式A（我选好了）：mode === 'group' 或 mode === ''（兼容旧数据）
    // - 模式B（你们来定）：mode === 'pick_for_them'
    // 当 mode 不可靠时，通过字段特征辅助判断：
    // - 模式A（我选好了）：有 candidatePosters（海报）、activityDate、peopleCount
    // - 模式B（你们来定）：没有 candidatePosters 或 candidatePosters 为空
    const hasPosters = room && room.candidatePosters && room.candidatePosters.length > 0;
    const hasActivityDate = room && room.activityDate;
    const hasDinnerTime = room && room.dinnerTime;

    // 优先使用 mode 字段判断
    const isModeB = mode === 'pick_for_them';
    const isModeA = mode === 'group' || mode === '';

    if (isModeB || (hasDinnerTime && !hasPosters)) {
      // 模式B：你们来定
      console.log('跳转到模式B编辑页面（mode:', mode, '）');
      wx.navigateTo({
        url: `/pages/create-mode-b/create-mode-b?edit=true&roomId=${roomId}`
      });
    } else {
      // 模式A：我选好了
      console.log('跳转到模式A编辑页面（mode:', mode, '）');
      wx.navigateTo({
        url: `/pages/create-mode-a/create-mode-a?edit=true&roomId=${roomId}`
      });
    }
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

    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'string') {
      date = new Date(dateStr);
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return '';

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
