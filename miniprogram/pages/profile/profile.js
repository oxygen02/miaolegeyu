/**
 * 个人中心页面
 * 功能：展示用户信息、登录/登出、统计概览、收藏/店铺/聚餐/房间列表管理
 * 登录方式：微信登录、快速体验（随机昵称）、自定义登录（头像+昵称选择页）
 */
const audioManager = getApp().globalData.audioManager;
const auth = getApp().globalData.auth;
const { imagePaths } = getApp().globalData;
const app = getApp();
const { checkContentWithToast } = require('../../utils/contentSecurity');

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
    imagePaths: {},
    currentTab: 2,
    animatingTab: -1
  },

  async onLoad() {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    this.checkLoginStatus();
  },

  onShow() {
    this.checkLoginStatus();
    this.updateTabBarSelected();
    if (this.data.userInfo.isLogin) {
      this.loadStats();
      if (this.data.currentList === 'myRooms') {
        this.loadMyRooms();
      }
      if (this.data.currentList === 'myScheduleVotes') {
        this.showMyScheduleVotes();
      }
    }
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 2 });
    }
  },

  switchTab(e) {
    const { index } = e.currentTarget.dataset;
    const tabIndex = parseInt(index);

    this.setData({ animatingTab: tabIndex });

    setTimeout(() => {
      this.setData({ animatingTab: -1 });
    }, 500);

    const urlMap = {
      0: '/pages/index/index',
      1: '/pages/fish-tank/fish-tank',
      2: '/pages/profile/profile'
    };
    const url = urlMap[tabIndex];
    if (!url) return;

    if (tabIndex === 2) {
      return;
    }

    wx.switchTab({ url });
  },

  previewImage(e) {
    const { src, urls } = e.currentTarget.dataset;
    if (!src) return;

    let imageUrls = [];
    if (urls && Array.isArray(urls)) {
      imageUrls = urls.filter(url => url);
    } else {
      imageUrls = [src];
    }

    wx.previewImage({
      current: src,
      urls: imageUrls
    });
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
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  // 自定义登录
  customLogin() {
    wx.navigateTo({
      url: '/package-user/pages/avatar-select/avatar-select?mode=login'
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
          // 内容安全检查：昵称
          const isContentSafe = await checkContentWithToast(res.content.trim());
          if (!isContentSafe) {
            return;
          }

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
      url: '/package-user/pages/avatar-select/avatar-select?mode=profile'
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
      
      // 使用 Promise.allSettled 避免一个失败影响其他
      const results = await Promise.allSettled([
        wx.cloud.callFunction({ name: 'getFavorites' }),
        wx.cloud.callFunction({ name: 'getMyShops' }),
        wx.cloud.callFunction({ name: 'getMyAppointments' }),
        wx.cloud.callFunction({ name: 'getMyRooms' }),
        wx.cloud.callFunction({ name: 'getMyParticipatedRooms' }),
        wx.cloud.callFunction({ name: 'getMyScheduleVotes', data: { mode: 'all', limit: 100 } })
      ]);


      // 安全获取数据长度
      const getCount = (result, dataKey = 'data') => {
        if (result.status !== 'fulfilled') {
          return 0;
        }
        const res = result.value;
        if (!res || !res.result) {
          return 0;
        }
        if (res.result.code !== undefined && res.result.code !== 0) {
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
      
      
      this.setData({ stats });
    } catch (err) {
    }
  },

  async showFavorites() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'favorites', loading: true });
    
    // 创建超时 Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 10000);
    });
    
    try {
      const { result } = await Promise.race([
        wx.cloud.callFunction({ name: 'getFavorites' }),
        timeoutPromise
      ]);
      
      if (result && result.success) {
        const favorites = result.favorites.map(item => {
          if (item.type === 'shop' && item.shop) {
            return {
              ...item,
              displayName: item.shop.name || '未知店铺',
              displayImage: item.shop.images && item.shop.images[0] || item.imageUrl || '',
              displayDesc: typeof (item.shop.address || item.shop.location) === 'object' ? '' : (item.shop.address || item.shop.location || '暂无地址'),
              displayRating: item.shop.rating || '',
              displayPrice: item.shop.averagePrice || item.shop.price || '',
              createTimeStr: this.formatDateTime(item.createTime)
            };
          } else if (item.type === 'appointment' && item.appointment) {
            return {
              ...item,
              displayName: item.appointment.shopName || '未知活动',
              displayImage: item.appointment.shopImage || item.appointment.imageUrl || item.imageUrl || '',
              displayDesc: typeof (item.appointment.location || item.appointment.address) === 'object' ? '' : (item.appointment.location || item.appointment.address || '暂无地点'),
              displayRating: '',
              displayPrice: '',
              createTimeStr: this.formatDateTime(item.createTime)
            };
          }
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
      } else {
        this.setData({ favorites: [], loading: false });
        wx.showToast({ title: result?.msg || '获取失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ favorites: [], loading: false });
      if (err.message === '请求超时') {
        wx.showToast({ title: '网络请求超时，请稍后重试', icon: 'none', duration: 2000 });
      } else {
        wx.showToast({ title: '获取收藏失败', icon: 'none' });
      }
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
      this.setData({ loading: false });
    }
  },

  async showMyAppointments() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'myAppointments', loading: true });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 10000);
    });
    
    try {
      const { result } = await Promise.race([
        wx.cloud.callFunction({ name: 'getMyAppointments' }),
        timeoutPromise
      ]);
      
      if (result && result.success) {
        const appointments = result.appointments.map(item => {
          const appointmentDate = item.appointmentTime ? new Date(item.appointmentTime) : null;
          const deadlineDate = item.deadline ? new Date(item.deadline) : null;

          return {
            ...item,
            appointmentTimeStr: this.formatDateTime(item.appointmentTime),
            deadlineStr: this.formatDateTime(item.deadline),
            participantCount: item.participants ? item.participants.length : 0,
            appointmentDate: appointmentDate ? this.formatDate(appointmentDate) : '',
            appointmentTime: appointmentDate ? this.formatTime(appointmentDate) : '',
            location: typeof (item.location || item.address) === 'object' ? (item.location || item.address).name || (item.location || item.location).address || '' : (item.location || item.address || ''),
            shopImage: item.shopImage || item.imageUrl || ''
          };
        });
        this.setData({ myAppointments: appointments, loading: false });
      } else {
        this.setData({ myAppointments: [], loading: false });
        wx.showToast({ title: result?.msg || '获取失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ myAppointments: [], loading: false });
      if (err.message === '请求超时') {
        wx.showToast({ title: '网络请求超时，请稍后重试', icon: 'none', duration: 2000 });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    }
  },

  async showMyScheduleVotes() {
    if (!this.checkLogin()) return;
    audioManager.playPawTap();
    this.setData({ currentList: 'myScheduleVotes', loading: true });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 10000);
    });
    
    try {
      const { result } = await Promise.race([
        wx.cloud.callFunction({ name: 'getMyScheduleVotes', data: { mode: 'all', limit: 100 } }),
        timeoutPromise
      ]);
      
      if (result && result.success) {
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
      } else {
        this.setData({ myScheduleVotes: [], loading: false });
        wx.showToast({ title: result?.msg || '获取失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ myScheduleVotes: [], loading: false });
      if (err.message === '请求超时') {
        wx.showToast({ title: '网络请求超时，请稍后重试', icon: 'none', duration: 2000 });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    }
  },

  goToScheduleVoteDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/package-schedule/pages/schedule-vote/result/result?voteId=${id}`
    });
  },

  // 时间投票管理按钮点击
  onManageScheduleVoteTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 编辑
          wx.navigateTo({
            url: `/package-schedule/pages/schedule-vote/create/create?edit=true&voteId=${id}`
          });
        } else if (res.tapIndex === 1) {
          // 删除
          this.deleteScheduleVote(id);
        }
      }
    });
  },

  // 删除时间投票
  async deleteScheduleVote(voteId) {
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个时间投票吗？删除后不可恢复',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'deleteRoomById',
          data: { roomId: voteId }
        });
        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.showMyScheduleVotes();
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

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 10000);
    });

    try {
      const { result } = await Promise.race([
        wx.cloud.callFunction({ name: 'getMyParticipatedRooms' }),
        timeoutPromise
      ]);

      if (result && result.code === 0) {
        const participated = result.data.map(item => {
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
            location: typeof item.location === 'object' ? item.location.name || item.location.address || '' : (item.location || ''),
            activityDate: typeof item.activityDate === 'object' ? '' : (item.activityDate || ''),
            activityTime: typeof item.activityTime === 'object' ? '' : (item.activityTime || ''),
            ...this.calcDeadlineUrgent(item.voteDeadline)
          };
        });
        this.setData({ myParticipated: participated, loading: false });
        this.startProfileDeadlineTimer('myParticipated');
      } else {
        this.setData({ myParticipated: [], loading: false });
        wx.showToast({ title: result?.msg || '获取失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ myParticipated: [], loading: false });
      if (err.message === '请求超时') {
        wx.showToast({ title: '网络请求超时，请稍后重试', icon: 'none', duration: 2000 });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
    }
  },

  // 加载我发起的聚餐列表
  async loadMyRooms() {
    this.setData({ loading: true });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 10000);
    });

    try {
      const { result } = await Promise.race([
        wx.cloud.callFunction({ name: 'getMyRooms' }),
        timeoutPromise
      ]);

      if (result && result.code === 0) {
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
          return {
            ...room,
            location: room.location && typeof room.location === 'object' ? room.location.name || room.location.address || '' : (room.location || ''),
            activityDate: room.activityDate && typeof room.activityDate === 'object' ? '' : (room.activityDate || ''),
            activityTime: room.activityTime && typeof room.activityTime === 'object' ? '' : (room.activityTime || ''),
            ...this.calcDeadlineUrgent(room.voteDeadline)
          };
        });
        this.setData({ myRooms: formattedRooms, loading: false });
        this.startProfileDeadlineTimer('myRooms');
      } else {
        this.setData({ myRooms: [], loading: false });
        wx.showToast({ title: result?.msg || '获取失败', icon: 'none' });
      }
    } catch (err) {
      this.setData({ myRooms: [], loading: false });
      if (err.message === '请求超时') {
        wx.showToast({ title: '网络请求超时，请稍后重试', icon: 'none', duration: 2000 });
      } else {
        wx.showToast({ title: '获取失败', icon: 'none' });
      }
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
    wx.navigateTo({ url: `/package-shop/pages/shop-detail/shop-detail?id=${id}` });
  },

  goToAppointmentDetail(e) {
    const { shopid } = e.currentTarget.dataset;
    if (shopid) {
      wx.navigateTo({ url: `/package-shop/pages/shop-detail/shop-detail?id=${shopid}` });
    }
  },

  goToRoomDetail(e) {
    const { roomid } = e.currentTarget.dataset;
    if (!roomid) return;

    // 查找房间信息判断类型
    const room = [...(this.data.myRooms || []), ...(this.data.myParticipated || [])]
      .find(r => r.roomId === roomid);

    // 拼单活动跳转到拼单详情页
    if (room?.mode === 'group') {
      wx.navigateTo({
        url: `/package-vote/pages/group-detail/group-detail?roomId=${roomid}`
      });
    } else {
      // 聚餐活动跳转到control页面
      wx.navigateTo({
        url: `/package-vote/pages/control/control?roomId=${roomid}`
      });
    }
  },

  // 点击管理按钮
  onManageTap(e) {
    // 使用 catchtap 阻止冒泡，不需要调用 stopPropagation
    const { roomid } = e.currentTarget.dataset;
    const room = this.data.myRooms.find(r => r.roomId === roomid);
    const isEnded = room && room.status === 'ended';
    const itemList = isEnded ? ['删除', '分享'] : ['编辑', '删除', '分享'];
    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (isEnded) {
          if (res.tapIndex === 0) {
            this.deleteRoom(roomid);
          } else if (res.tapIndex === 1) {
            this.shareRoom(roomid);
          }
        } else {
          if (res.tapIndex === 0) {
            this.editRoom(roomid);
          } else if (res.tapIndex === 1) {
            this.deleteRoom(roomid);
          } else if (res.tapIndex === 2) {
            this.shareRoom(roomid);
          }
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
            wx.navigateTo({ url: `/package-shop/pages/shop-detail/shop-detail?id=${appointment.shopId}` });
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
      wx.navigateTo({ url: `/package-shop/pages/shop-detail/shop-detail?id=${item.targetId}` });
    } else if (item.type === 'appointment' && item.targetId) {
      wx.navigateTo({ url: `/package-shop/pages/shop-detail/shop-detail?id=${item.targetId}` });
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
        title: room ? `「${room.title || '聚会投票'}」快来一起选餐厅！` : '快来一起选餐厅！',
        path: `/package-vote/pages/vote/vote?roomId=${roomId}`,
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
    const room = this.data.myRooms.find(r => r.roomId === roomid);
    const isEnded = room && room.status === 'ended';
    const itemList = iscreator ? (isEnded ? ['删除'] : ['编辑', '删除']) : ['取消参与'];

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
    if (room && room.status === 'ended') {
      wx.showToast({ title: '活动已过期，不可编辑', icon: 'none' });
      return;
    }
    const mode = room ? room.mode : '';


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
      wx.navigateTo({
        url: `/package-create/pages/create-mode-b/create-mode-b?edit=true&roomId=${roomId}`
      });
    } else {
      // 模式A：我选好了
      wx.navigateTo({
        url: `/package-create/pages/create-mode-a/create-mode-a?edit=true&roomId=${roomId}`
      });
    }
  },

  // 删除房间（房主）
  async deleteRoom(roomId) {
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个聚会吗？删除后不可恢复',
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
      content: '确定要取消参与这个聚会吗？',
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

  editShop(e) {
    const item = e.currentTarget.dataset.item;
    if (!item || !item._id) return;

    // 跳转到推荐店铺页（upload-shop），携带编辑数据
    wx.reLaunch({
      url: `/package-shop/pages/upload-shop/upload-shop?mode=edit&shopId=${item._id}`
    });
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
    wx.navigateTo({ url: '/package-user/pages/settings/settings' });
  },

  goToFeedback() {
    wx.navigateTo({ url: '/package-user/pages/feedback/feedback' });
  },

  goToAbout() {
    wx.navigateTo({ url: '/package-user/pages/about/about' });
  },

  goToAdminDashboard() {
    wx.navigateTo({ url: '/package-admin/pages/admin-dashboard/admin-dashboard' });
  },

  goToReportPage() {
    wx.navigateTo({ url: '/package-user/pages/report/report' });
  },

  preventBubble() {
    // 阻止事件冒泡
  }
});
