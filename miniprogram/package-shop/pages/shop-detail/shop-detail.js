const app = getApp();
const { imagePaths } = getApp().globalData;
const { checkContentWithToast } = require('../../../utils/contentSecurity');

// 生成年月日时分数据
const generateDateTimeData = () => {
  const years = ['2026', '2027', '2028'];
  const months = [];
  const days = [];
  const hours = [];
  const minutes = [];
  
  for (let i = 1; i <= 12; i++) {
    months.push((i < 10 ? '0' : '') + i);
  }
  for (let i = 1; i <= 31; i++) {
    days.push((i < 10 ? '0' : '') + i);
  }
  for (let i = 0; i < 24; i++) {
    hours.push((i < 10 ? '0' : '') + i);
  }
  for (let i = 0; i < 60; i++) {
    minutes.push((i < 10 ? '0' : '') + i);
  }
  
  return { years, months, days, hours, minutes };
};

const { years, months, days, hours, minutes } = generateDateTimeData();

Page({
  data: {
    imagePaths: {},
    shop: null,
    loading: true,
    currentImageIndex: 0,
    // 收藏状态
    isFavorited: false,
    // 是否店铺发起者
    isShopOwner: false,
    // 弹幕相关
    danmakuPresets: [
      '这家店味道太棒了！👍',
      '环境不错，推荐推荐~',
      '性价比很高！！',
      '会再来光顾的 🐟',
      '服务态度超好 ❤️',
      '排队也值得！',
      '人均消费很合理',
      '菜品摆盘精致 ✨',
      '适合朋友聚会',
      '停车方便 👍',
      '下次带家人来',
      '宝藏店铺发现！',
      '辣度刚刚好 🔥',
      '甜品必点！',
      '拍照超出片 📸'
    ],
    userInfo: {},
    // 约饭相关
    appointment: null,
    isJoining: false,
    appointmentLoaded: false,
    countdownTimer: null,
    isInitiator: false,
    historyAppointments: [],
    // 弹窗
    showAppointmentModal: false,
    appointmentTime: '',
    deadlineTime: '',
    appointmentNote: '',
    maxParticipants: '',
    // 时间选择器数据
    years,
    months,
    days,
    hours,
    minutes,
    // 约饭时间选择（双存储：显示值 + 原始数字）
    appointmentDate: '',
    appointmentDateRaw: '',
    appointmentTime: '',
    appointmentTimeRaw: '',
    // 截止时间选择
    deadlineDate: '',
    deadlineDateRaw: '',
    deadlineTime: '',
    deadlineTimeRaw: '',
    // 约束条件
    requirementOptions: [
      { id: 'noAlcohol', name: '不喝酒', selected: false },
      { id: 'noSmoking', name: '不吸烟', selected: false },
      { id: 'quiet', name: '安静环境', selected: false },
      { id: 'custom', name: '自定义', selected: false }
    ],
    showCustomRequirement: false,
    customRequirement: '',
    // 付费模式
    paymentMode: 'AA',
    // 参与者显示
    showParticipantNames: false,
    participantNames: '',
    // 评价
    showRatingModal: false,
    ratingStars: 0,
    ratingComment: '',
    // 编辑店铺弹窗
    showEditShopModal: false,
    editShopName: '',
    editShopAddress: '',
    editShopReason: '',
    editShopTips: '',
    editCuisineOptions: [],
    editSelectedCuisines: [],
    // 发起者操作菜单
    showOwnerActions: false,
    // 匿名发起选项
    isAnonymousInitiator: false
  },

async onLoad(options) {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });

    // 获取当前用户信息（用于弹幕头像）
    this.loadCurrentUserInfo();

    const { id, appointmentId, openAppointment } = options;
    
    if (id) {
      // 通过店铺ID加载（原有逻辑）
      this.initTimePicker();
      await this.loadShopDetail(id);
      await Promise.all([
        this.loadAppointment(id),
        this.loadHistoryAppointments(id)
      ]);
      
      if (openAppointment === '1') {
        if (this.data.shop) {
          this.onCreateAppointment();
        }
      }
    } else if (appointmentId) {
      // 通过约饭活动ID加载（兜底方案）
      console.log('通过appointmentId加载店铺:', appointmentId);
      this.initTimePicker();
      
      try {
        // 先获取约饭活动信息，从中得到shopId
        const { result } = await wx.cloud.callFunction({
          name: 'getDiningAppointments',
          data: {}
        });
        
        if (result.success && result.appointments) {
          const apt = result.appointments.find(a => a._id === appointmentId || a.roomId === appointmentId);
          if (apt && apt.shopId) {
            await this.loadShopDetail(apt.shopId);
            await Promise.all([
              this.loadAppointment(apt.shopId),
              this.loadHistoryAppointments(apt.shopId)
            ]);
            return;
          }
        }
      } catch (err) {
        console.error('通过appointmentId加载失败:', err);
      }
      
      // 如果找不到，显示提示但不返回，让用户能看到页面
      wx.showToast({ title: '约饭信息加载失败', icon: 'none' });
    } else {
      wx.showToast({ title: '店铺ID不存在', icon: 'none' });
      wx.navigateBack();
    }
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
  },

  // 初始化时间选择器
  initTimePicker() {
    this.setData({
      appointmentDate: '',
      appointmentDateRaw: '',
      appointmentTime: '',
      appointmentTimeRaw: '',
      deadlineDate: '',
      deadlineDateRaw: '',
      deadlineTime: '',
      deadlineTimeRaw: ''
    });
  },

  // 格式化日期，支持3位数字自动补零（如423 -> 0423）
  formatDate(value) {
    if (!value) return '';
    // 只保留数字
    value = value.replace(/\D/g, '');
    // 3位数字时，首位补零（仅在输入时，不是删除时）
    if (value.length === 3 && !value.startsWith('0')) {
      value = '0' + value;
    }
    return value;
  },

  async loadShopDetail(id) {
    this.setData({ loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getShopDetail',
        data: { id }
      });

      if (result.success) {
        const shop = {
          ...result.shop,
          pawRating: this.generatePawRating(result.shop.rating)
        };
        
        // platformUrl 从数据库获取，确保有默认值
        shop.platformUrl = shop.platformUrl || '';
        
        // 模拟数据：添加追加推荐人
        shop.additionalRecommenders = [
          {
            openId: 'user1',
            name: '吃货小王',
            avatar: imagePaths.decorations.catAvatarIcon,
            isAnonymous: false,
            rating: 5,
            ratingComment: '味道很棒，推荐！',
            appointmentTime: '2026-04-20'
          },
          {
            openId: 'user2',
            name: '美食家小李',
            avatar: imagePaths.decorations.catAvatarIcon,
            isAnonymous: false,
            rating: 4,
            ratingComment: '环境不错',
            appointmentTime: '2026-04-15'
          },
          {
            openId: 'user3',
            name: '',
            avatar: '',
            isAnonymous: true,
            rating: 5,
            ratingComment: '',
            appointmentTime: '2026-04-10'
          }
        ];
        
        // 模拟数据：更新评分和评分人数
        shop.rating = 4.5;
        shop.ratingCount = 4; // 包含发起人在内的总评分人数
        
        // 模拟数据：历史组团记录
        const historyAppointments = [
          {
            _id: 'apt1',
            appointmentTimeStr: '2026年4月20日',
            initiatorOpenId: 'user1',
            initiatorName: '吃货小王',
            initiatorAvatar: imagePaths.decorations.catAvatarIcon,
            isAnonymous: false,
            participantCount: 4,
            participants: [
              { openId: 'user1', name: '吃货小王', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user4', name: '张三', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user5', name: '李四', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user6', name: '王五', avatar: imagePaths.decorations.catAvatarIcon }
            ],
            rating: { stars: 5, comment: '味道很棒，推荐！' }
          },
          {
            _id: 'apt2',
            appointmentTimeStr: '2026年4月15日',
            initiatorOpenId: 'user2',
            initiatorName: '美食家小李',
            initiatorAvatar: imagePaths.decorations.catAvatarIcon,
            isAnonymous: false,
            participantCount: 3,
            participants: [
              { openId: 'user2', name: '美食家小李', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user7', name: '赵六', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user8', name: '钱七', avatar: imagePaths.decorations.catAvatarIcon }
            ],
            rating: { stars: 4, comment: '环境不错' }
          },
          {
            _id: 'apt3',
            appointmentTimeStr: '2026年4月10日',
            initiatorOpenId: 'user3',
            initiatorName: '',
            initiatorAvatar: '',
            isAnonymous: true,
            participantCount: 5,
            participants: [
              { openId: 'user3', name: '', avatar: '' },
              { openId: 'user9', name: '用户9', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user10', name: '用户10', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user11', name: '用户11', avatar: imagePaths.decorations.catAvatarIcon },
              { openId: 'user12', name: '用户12', avatar: imagePaths.decorations.catAvatarIcon }
            ],
            rating: { stars: 5, comment: '' }
          }
        ];
        
        // 检查用户是否可以评分（去过该店铺但未评分）
        const canRateShop = true; // 模拟显示评分按钮
        
        this.setData({ 
          shop, 
          loading: false,
          isShopOwner: result.isOwner || false,
          canRateShop,
          historyAppointments
        });
        // 检查收藏状态
        this.checkFavoriteStatus(id, 'shop');
      } else {
        throw new Error(result.error || '加载失败');
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 检查收藏状态
  async checkFavoriteStatus(targetId, type) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'checkFavorite',
        data: { targetId, type }
      });
      if (result.success) {
        this.setData({ isFavorited: result.isFavorited });
      }
    } catch (err) {
    }
  },

  // 切换收藏状态
  async toggleFavorite() {
    const { shop, isFavorited } = this.data;
    try {
      wx.showLoading({ title: isFavorited ? '取消中...' : '收藏中...' });
      const { result } = await wx.cloud.callFunction({
        name: 'toggleFavorite',
        data: { targetId: shop._id, type: 'shop' }
      });
      wx.hideLoading();
      
      if (result.success) {
        this.setData({ isFavorited: result.isFavorited });
        wx.showToast({ 
          title: result.isFavorited ? '收藏成功' : '已取消收藏', 
          icon: 'success' 
        });
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 分享功能
  onShareAppMessage() {
    const { shop } = this.data;
    return {
      title: `${shop.name} - 喵了个鱼美食推荐`,
      path: `/package-shop/pages/shop-detail/shop-detail?id=${shop._id}`,
      imageUrl: shop.images && shop.images.length > 0 ? shop.images[0] : ''
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { shop } = this.data;
    return {
      title: `${shop.name} - 喵了个鱼美食推荐`,
      query: `id=${shop._id}`,
      imageUrl: shop.images && shop.images.length > 0 ? shop.images[0] : ''
    };
  },

  // 举报店铺
  reportShop() {
    const { shop } = this.data;
    if (!shop || !shop._id) return;
    wx.showActionSheet({
      itemList: ['举报该店铺'],
      itemColor: '#FF6B6B',
      success: () => {
        wx.navigateTo({
          url: `/package-user/pages/report/report?type=shop&targetId=${shop._id}`
        });
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 打开位置导航
  openLocation(e) {
    const { address, name } = e.currentTarget.dataset;

    if (!address) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    // 先获取用户当前位置作为参考点
    wx.getLocation({
      type: 'gcj02',
      success: (userRes) => {
        // 打开地图选择导航
        wx.showActionSheet({
          itemList: ['使用腾讯地图导航', '复制地址'],
          success: (res) => {
            if (res.tapIndex === 0) {
              // 使用腾讯地图，以用户位置为起点显示地图，地址作为标注
              wx.openLocation({
                latitude: userRes.latitude,
                longitude: userRes.longitude,
                name: name || '目的地',
                address: address,
                scale: 16,
                fail: () => {
                  // 失败则复制地址
                  this.copyAddress(address);
                }
              });
            } else if (res.tapIndex === 1) {
              this.copyAddress(address);
            }
          }
        });
      },
      fail: () => {
        // 无法获取位置时直接复制地址
        this.copyAddress(address);
      }
    });
  },

  copyAddress(address) {
    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' });
      }
    });
  },

  // 显示发起者操作菜单
  showOwnerActions() {
    this.setData({ showOwnerActions: true });
  },

  // 关闭发起者操作菜单
  closeOwnerActions() {
    this.setData({ showOwnerActions: false });
  },

  // 显示编辑店铺弹窗
  showEditShopModal() {
    const { shop } = this.data;
    // 菜系选项列表
    const cuisineOptions = [
      { id: 'chuanyu', name: '川渝' },
      { id: 'xianggan', name: '湘赣' },
      { id: 'yueshi', name: '粤式' },
      { id: 'jiangnan', name: '江南' },
      { id: 'beifang', name: '北方' },
      { id: 'xibei', name: '西北' },
      { id: 'yungui', name: '云贵' },
      { id: 'huazhong', name: '华中' },
      { id: 'huoguo', name: '火锅' },
      { id: 'chuanchuan', name: '串串' },
      { id: 'shaokao', name: '烧烤' },
      { id: 'longxia', name: '龙虾' },
      { id: 'riliao', name: '日料' },
      { id: 'hanliao', name: '韩料' },
      { id: 'dongnanya', name: '东南亚' },
      { id: 'xishi', name: '西式' },
      { id: 'haixian', name: '海鲜' },
      { id: 'zizhu', name: '自助' },
      { id: 'nongjia', name: '农家' },
      { id: 'sifang', name: '私房' },
      { id: 'snack', name: '小吃' }
    ];
    // 获取当前店铺的菜系（可能是数组或字符串）
    const currentCuisines = shop.cuisines || (shop.cuisine ? [shop.cuisine] : []);
    // 标记已选中的菜系
    const editCuisineOptions = cuisineOptions.map(item => ({
      ...item,
      selected: currentCuisines.includes(item.id)
    }));
    this.setData({
      showEditShopModal: true,
      editShopName: shop.name || '',
      editShopAddress: shop.address || '',
      editShopReason: shop.reason || '',
      editShopTips: shop.tips || '',
      editCuisineOptions,
      editSelectedCuisines: currentCuisines
    });
  },

  // 关闭编辑店铺弹窗
  closeEditShopModal() {
    this.setData({ showEditShopModal: false });
  },

  // 编辑店铺输入
  onEditShopNameInput(e) {
    this.setData({ editShopName: e.detail.value });
  },
  onEditShopAddressInput(e) {
    this.setData({ editShopAddress: e.detail.value });
  },
  onEditShopReasonInput(e) {
    this.setData({ editShopReason: e.detail.value });
  },
  onEditShopTipsInput(e) {
    this.setData({ editShopTips: e.detail.value });
  },

  // 切换菜系标签选择
  toggleCuisineTag(e) {
    const { id } = e.currentTarget.dataset;
    const { editCuisineOptions } = this.data;
    const updatedOptions = editCuisineOptions.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    const selectedCuisines = updatedOptions
      .filter(item => item.selected)
      .map(item => item.id);
    this.setData({
      editCuisineOptions: updatedOptions,
      editSelectedCuisines: selectedCuisines
    });
  },

  // 提交编辑店铺
  async submitEditShop() {
    const { shop, editShopName, editShopAddress, editShopReason, editShopTips, editSelectedCuisines } = this.data;

    if (!editShopName.trim()) {
      wx.showToast({ title: '店铺名称不能为空', icon: 'none' });
      return;
    }

    // 内容安全检查：店铺信息
    const contentToCheck = [editShopName, editShopAddress, editShopReason, editShopTips].filter(Boolean).join(' ');
    if (contentToCheck) {
      const isContentSafe = await checkContentWithToast(contentToCheck);
      if (!isContentSafe) {
        return;
      }
    }

    wx.showLoading({ title: '保存中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateShop',
        data: {
          shopId: shop._id,
          name: editShopName,
          address: editShopAddress,
          reason: editShopReason,
          tips: editShopTips,
          cuisines: editSelectedCuisines
        }
      });

      if (result.success) {
        wx.showToast({ title: '修改成功', icon: 'success' });
        this.closeEditShopModal();
        this.loadShopDetail(shop._id);
      } else {
        wx.showToast({ title: result.error || '修改失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '修改失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除店铺
  async deleteShop() {
    const { shop } = this.data;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个店铺推荐吗？',
      confirmColor: '#FF6B6B'
    });

    if (res.confirm) {
      wx.showLoading({ title: '删除中...' });
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'deleteShop',
          data: { shopId: shop._id }
        });

        if (result.success) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
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

  // 加载约饭报名
  async loadAppointment(shopId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { shopId }
      });

      if (result.success && result.appointments && result.appointments.length > 0) {
        const appointment = result.appointments[0];
        const isInitiator = appointment.initiatorOpenId === result.openid;

        // 解析截止时间（云数据库 Date 存储为 UTC，需转东八区）
        let deadlineDate = this.parseCloudDate(appointment.deadline);
        console.log('[deadline调试] 原始值:', JSON.stringify(appointment.deadline), '解析后:', deadlineDate.toISOString());

        const now = new Date();
        const remainingTime = deadlineDate.getTime() - now.getTime();
        appointment.remainingTime = remainingTime > 0 ? remainingTime : 0;

        // 直接用 parseCloudDate 的结果格式化 deadlineStr
        const deadlineStr = this.formatDateTimeFromDate(deadlineDate);


        this.setData({
          appointment: {
            ...appointment,
            appointmentTimeStr: this.formatDateTime(appointment.appointmentTime),
            deadlineStr: deadlineStr,
            countdownText: this.formatCountdown(appointment.remainingTime),
            isFull: appointment.maxParticipants > 0 && appointment.participants.length >= appointment.maxParticipants
          },
          isInitiator,
          appointmentLoaded: true
        });

        this.startCountdown(appointment);
      } else {
        // 如果没有活动，确保 appointment 为 null
        this.setData({
          appointment: null,
          isInitiator: false,
          appointmentLoaded: true
        });
      }
    } catch (err) {
      // 出错时设置加载完成标志，显示发起约饭按钮
      this.setData({
        appointment: null,
        isInitiator: false,
        appointmentLoaded: true
      });
      wx.showToast({ title: '加载活动失败，请下拉刷新', icon: 'none' });
    }
  },

  // 加载历史组团记录
  async loadHistoryAppointments(shopId) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { 
          shopId,
          status: 'completed'
        }
      });

      if (result.success) {
        const history = result.appointments.map(item => ({
          ...item,
          appointmentTimeStr: this.formatDateTime(item.appointmentTime),
          participantCount: item.participants.length
        }));
        this.setData({ historyAppointments: history });
      }
    } catch (err) {
    }
  },

  // 启动倒计时
  startCountdown(appointment) {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }

    if (appointment.remainingTime > 0) {
      const timer = setInterval(() => {
        const remaining = appointment.remainingTime - 1000;
        appointment.remainingTime = remaining;

        if (remaining <= 0) {
          clearInterval(timer);
          this.setData({
            'appointment.remainingTime': 0,
            'appointment.countdownText': '已截止'
          });
        } else {
          this.setData({
            'appointment.countdownText': this.formatCountdown(remaining)
          });
        }
      }, 1000);

      this.setData({ countdownTimer: timer });
    }
  },

  // 解析云数据库日期（处理 UTC 存储导致的时区偏移）
  parseCloudDate(dateVal) {
    if (!dateVal) return new Date();
    let date;
    if (dateVal instanceof Date) {
      date = dateVal;
    } else if (typeof dateVal === 'object' && dateVal.$date) {
      // 云数据库 $date 格式，通常是 UTC 时间字符串
      date = new Date(dateVal.$date);
      // $date 是 UTC，直接加8小时转东八区
      return new Date(date.getTime() + 8 * 60 * 60 * 1000);
    } else if (typeof dateVal === 'object' && dateVal._date) {
      date = new Date(dateVal._date);
      return new Date(date.getTime() + 8 * 60 * 60 * 1000);
    } else if (typeof dateVal === 'string') {
      // 字符串格式：可能是 toLocaleString() 的结果（UTC时间被当字符串传回）
      // 或 ISO 格式
      date = new Date(dateVal);
      if (isNaN(date.getTime())) return new Date();
      // 如果字符串包含 UTC 标记或是纯 toLocaleString 结果，需要加8小时
      // 判断：如果字符串不含时区信息且来自云函数 toLocaleString，则它是 UTC 时间显示
      return new Date(date.getTime() + 8 * 60 * 60 * 1000);
    } else {
      date = new Date(dateVal);
    }
    if (isNaN(date.getTime())) return new Date();
    return date;
  },

  // 从已解析的 Date 对象格式化显示（不再做时区转换）
  formatDateTimeFromDate(date) {
    if (!date || isNaN(date.getTime())) return '';
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '';

    let date;
    if (dateStr instanceof Date) {
      date = dateStr;
    } else if (typeof dateStr === 'string') {
      date = new Date(dateStr);
    } else if (typeof dateStr === 'number') {
      date = new Date(dateStr);
    } else if (typeof dateStr === 'object' && dateStr !== null) {
      // 云数据库 Date 类型序列化后的格式（$date 为 UTC 时间）
      if (dateStr.$date) {
        date = new Date(dateStr.$date);
      } else if (dateStr._date) {
        date = new Date(dateStr._date);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) {
      return '';
    }

    // 修正云数据库 UTC 存储导致的8小时偏移（直接加8小时，不用 getTimezoneOffset 抵消）
    const localDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const month = (localDate.getMonth() + 1 < 10 ? '0' : '') + (localDate.getMonth() + 1);
    const day = (localDate.getDate() < 10 ? '0' : '') + localDate.getDate();
    const hour = (localDate.getHours() < 10 ? '0' : '') + localDate.getHours();
    const minute = (localDate.getMinutes() < 10 ? '0' : '') + localDate.getMinutes();
    return `${month}月${day}日 ${hour}:${minute}`;
  },

  formatCountdown(remainingTime) {
    if (remainingTime <= 0) return '已截止';

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `剩余 ${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `剩余 ${minutes}分${seconds}秒`;
    } else {
      return `剩余 ${seconds}秒`;
    }
  },

  generatePawRating(rating) {
    const count = Math.round(rating) || 3;
    return Array(5).fill(0).map((_, i) => i < count);
  },

  onImageChange(e) {
    this.setData({ currentImageIndex: e.detail.current });
  },

  onImageTap(e) {
    const { url } = e.currentTarget.dataset;
    this._previewImage(url);
  },

  _previewImage(currentUrl) {
    const { shop } = this.data;
    if (!shop || !shop.images || shop.images.length === 0) return;
    wx.previewImage({
      current: currentUrl || shop.images[this.data.currentImageIndex],
      urls: shop.images
    });
  },

  // ========== 图片区域手势：下滑进入预览 ==========
  onImageTouchStart(e) {
    this._touchStartY = e.touches[0].clientY;
    this._touchStartX = e.touches[0].clientX;
    this._isVerticalSwipe = false;
  },

  onImageTouchMove(e) {
    const dy = e.touches[0].clientY - this._touchStartY;
    const dx = e.touches[0].clientX - this._touchStartX;
    // 只有当纵向位移明显大于横向位移时，才认为是垂直滑动
    if (Math.abs(dy) > Math.abs(dx) && dy > 30) {
      this._isVerticalSwipe = true;
    }
  },

  onImageTouchEnd(e) {
    if (!this._isVerticalSwipe) return;
    const dy = e.changedTouches[0].clientY - this._touchStartY;
    // 向下滑动超过 80px 触发预览
    if (dy > 80) {
      this._previewImage();
    }
    this._isVerticalSwipe = false;
  },

  // 点击发起约饭
  onCreateAppointment() {
    this.initTimePicker(); // 初始化时间选择器
    this.setData({
      showAppointmentModal: true,
      // 重置所有时间相关字段
      appointmentDate: '',
      appointmentDateRaw: '',
      appointmentTime: '',
      appointmentTimeRaw: '',
      deadlineDate: '',
      deadlineDateRaw: '',
      deadlineTime: '',
      deadlineTimeRaw: '',
      // 重置其他字段
      appointmentNote: '',
      maxParticipants: '',
      customRequirement: '',
      showCustomRequirement: false,
      paymentMode: 'AA', // 默认AA制
      isAnonymousInitiator: false, // 默认不匿名
      requirementOptions: [
        { id: 'noAlcohol', name: '不喝酒', selected: false },
        { id: 'noSmoking', name: '不吸烟', selected: false },
        { id: 'quiet', name: '安静环境', selected: false },
        { id: 'custom', name: '自定义', selected: false }
      ]
    });
  },

  // 切换匿名发起选项
  toggleAnonymous() {
    this.setData({
      isAnonymousInitiator: !this.data.isAnonymousInitiator
    });
  },

  // 选择付费模式
  selectPaymentMode(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ paymentMode: mode });
  },

  // 约饭时间输入（月日 | 时分格式，中文显示）- 参考create-mode-b写法
  onAppointmentDateInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ appointmentDate: value, appointmentDateRaw: numbers });
      return;
    }
    
    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ appointmentDate: displayValue, appointmentDateRaw: numbers });
  },
  onAppointmentDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 3位数字补齐为4位（608 -> 0608）
    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 验证日期有效性
    if (rawValue.length === 4) {
      const month = parseInt(rawValue.substring(0, 2), 10);
      const day = parseInt(rawValue.substring(2, 4), 10);
      if (month < 1 || month > 12 || day < 1 || day > 31 || (month === 0 && day === 0)) {
        wx.showToast({ title: '月日格式无效，如 0608', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length > 0 && rawValue.length < 4) {
      rawValue = '';
    }

    let displayValue = this.formatDateDisplay(rawValue);
    this.setData({ appointmentDate: displayValue, appointmentDateRaw: rawValue });
  },
  onAppointmentTimeInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（时、分），说明用户正在编辑格式化后的文本
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ appointmentTime: value, appointmentTimeRaw: numbers });
      return;
    }
    
    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ appointmentTime: displayValue, appointmentTimeRaw: numbers });
  },
  onAppointmentTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 不再自动补全2位为4位，让用户自行输入完整时分
    // 只验证有效性，不改变用户输入
    if (rawValue.length === 4) {
      const hour = parseInt(rawValue.substring(0, 2), 10);
      const minute = parseInt(rawValue.substring(2, 4), 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        wx.showToast({ title: '时分无效，如 1200 表示12点', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length === 2) {
      // 2位数字视为有效的小时数（整点），保持原值不补全
      const hour = parseInt(rawValue, 10);
      if (hour < 0 || hour > 23) {
        wx.showToast({ title: '小时应在 00-23 之间', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length === 1 || rawValue.length === 3) {
      // 1位或3位数字，保持原值不做处理（等待用户继续输入）
    } else if (rawValue.length > 4) {
      rawValue = rawValue.substring(0, 4);
    } else {
      rawValue = '';
    }

    let displayValue = this.formatTimeDisplay(rawValue);
    this.setData({ appointmentTime: displayValue, appointmentTimeRaw: rawValue });
  },

  // 清空约饭时间
  clearAppointmentTime() {
    this.setData({
      appointmentDate: '',
      appointmentDateRaw: '',
      appointmentTime: '',
      appointmentTimeRaw: ''
    });
  },

  // 清空截止时间
  clearDeadlineTime() {
    this.setData({
      deadlineDate: '',
      deadlineDateRaw: '',
      deadlineTime: '',
      deadlineTimeRaw: ''
    });
  },

  // 截止时间输入（月日 | 时分格式，中文显示）- 参考create-mode-b写法
  onDeadlineDateInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineDate: value, deadlineDateRaw: numbers });
      return;
    }
    
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: numbers });
  },
  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 3位数字补齐为4位（608 -> 0608）
    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 验证日期有效性
    if (rawValue.length === 4) {
      const month = parseInt(rawValue.substring(0, 2), 10);
      const day = parseInt(rawValue.substring(2, 4), 10);
      if (month < 1 || month > 12 || day < 1 || day > 31 || (month === 0 && day === 0)) {
        wx.showToast({ title: '月日格式无效，如 0608', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length > 0 && rawValue.length < 4) {
      rawValue = '';
    }

    let displayValue = this.formatDateDisplay(rawValue);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: rawValue });
  },
  onDeadlineTimeInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（时、分），说明用户正在编辑格式化后的文本
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers });
      return;
    }
    
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: numbers });
  },
  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 不再自动补全2位为4位，让用户自行输入完整时分
    if (rawValue.length === 4) {
      const hour = parseInt(rawValue.substring(0, 2), 10);
      const minute = parseInt(rawValue.substring(2, 4), 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        wx.showToast({ title: '时分无效，如 1200 表示12点', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length === 2) {
      // 2位数字视为有效的小时数（整点），保持原值不补全
      const hour = parseInt(rawValue, 10);
      if (hour < 0 || hour > 23) {
        wx.showToast({ title: '小时应在 00-23 之间', icon: 'none' });
        rawValue = '';
      }
    } else if (rawValue.length === 1 || rawValue.length === 3) {
      // 保持原值不做处理
    } else if (rawValue.length > 4) {
      rawValue = rawValue.substring(0, 4);
    } else {
      rawValue = '';
    }

    let displayValue = this.formatTimeDisplay(rawValue);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: rawValue });
  },

  // 格式化方法 - 参考create-mode-b写法
  // 月日格式化：608 -> 6月8日，0608 -> 6月8日，64 -> 6月4日
  formatDateDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
    }
    // 3位数字：第一位是月，后两位是日
    if (numbers.length === 3) {
      const m = numbers.substring(0, 1);
      const d = numbers.substring(1);
      return m + '月' + d + '日';
    }
    // 4位数字
    const month = numbers.substring(0, 2);
    const day = numbers.substring(2);
    return month + '月' + day + '日';
  },
  // 时分格式化 - 参考create-mode-b写法
  // 12 -> 12，6 -> 6，123 -> 12时3分，1200 -> 12时00分
  formatTimeDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
    }
    // 3位数字
    if (numbers.length === 3) {
      const h = numbers.substring(0, 2);
      const m = numbers.substring(2);
      return h + '时' + m + '分';
    }
    // 4位数字
    const hour = numbers.substring(0, 2);
    const minute = numbers.substring(2);
    return hour + '时' + minute + '分';
  },

  closeAppointmentModal() {
    this.setData({ showAppointmentModal: false });
  },

  preventBubble() {},

  // 约饭时间输入
  onTimeInput(e) {
    this.setData({ appointmentTimeDisplay: e.detail.value });
  },

  // 约饭时间失去焦点时验证
  onTimeBlur(e) {
    const value = e.detail.value;
    if (!value) return;

    // 验证格式 yyyy-MM-dd HH:mm
    const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
    const match = value.match(regex);

    if (!match) {
      wx.showToast({ title: '格式错误，请使用: 2026-04-21 18:30', icon: 'none' });
      return;
    }

    const [_, year, month, day, hour, minute] = match;
    const inputDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
    const now = new Date();

    // 检查是否早于当前时间
    if (inputDate <= now) {
      wx.showToast({ title: '约饭时间必须晚于当前时间', icon: 'none' });
      return;
    }

    // 保存标准格式（带东八区时区）
    this.setData({
      appointmentTime: `${year}-${month}-${day}T${hour}:${minute}:00+08:00`,
      appointmentTimeDisplay: value
    });
  },

  // 截止时间输入
  onDeadlineInput(e) {
    this.setData({ deadlineTimeDisplay: e.detail.value });
  },

  // 截止时间失去焦点时验证
  onDeadlineBlur(e) {
    const value = e.detail.value;
    if (!value) return;

    // 验证格式 yyyy-MM-dd HH:mm
    const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/;
    const match = value.match(regex);

    if (!match) {
      wx.showToast({ title: '格式错误，请使用: 2026-04-21 17:00', icon: 'none' });
      return;
    }

    const [_, year, month, day, hour, minute] = match;
    const inputDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+08:00`);
    const now = new Date();

    // 检查是否早于当前时间
    if (inputDate <= now) {
      wx.showToast({ title: '截止时间必须晚于当前时间', icon: 'none' });
      return;
    }

    // 检查是否在约饭时间之前
    if (this.data.appointmentTime) {
      const appointmentDate = new Date(this.data.appointmentTime);
      if (inputDate >= appointmentDate) {
        wx.showToast({ title: '截止时间必须在约饭时间之前', icon: 'none' });
        return;
      }
    }

    // 保存标准格式（带东八区时区）
    this.setData({
      deadlineTime: `${year}-${month}-${day}T${hour}:${minute}:00+08:00`,
      deadlineTimeDisplay: value
    });
  },

  onMaxParticipantsInput(e) {
    this.setData({ maxParticipants: e.detail.value });
  },

  toggleRequirement(e) {
    const { id } = e.currentTarget.dataset;
    const options = this.data.requirementOptions.map(item => {
      if (item.id === id) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });
    
    const customItem = options.find(item => item.id === 'custom');
    this.setData({ 
      requirementOptions: options,
      showCustomRequirement: customItem && customItem.selected
    });
  },

  onCustomRequirementInput(e) {
    this.setData({ customRequirement: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ appointmentNote: e.detail.value });
  },

  // 解析月日raw值为标准MMDD格式（处理3位和4位数字）
  parseDateRaw(rawValue) {
    if (!rawValue) return '';
    // 先过滤非数字字符（防止异常字符如E等）
    let numbers = String(rawValue).replace(/\D/g, '');
    if (!numbers) return '';
    // 3位数字补前导零：608 -> 0608
    if (numbers.length === 3) {
      numbers = '0' + numbers;
    }
    if (numbers.length !== 4) return '';
    // 验证有效性
    const month = parseInt(numbers.substring(0, 2), 10);
    const day = parseInt(numbers.substring(2, 4), 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return '';
    return numbers;
  },

  // 解析时分raw值为标准HHMM格式（处理2位、3位、4位数字）
  parseTimeRaw(rawValue) {
    if (!rawValue) return '';
    // 先过滤非数字字符（防止异常字符如E等）
    let numbers = String(rawValue).replace(/\D/g, '');
    if (!numbers) return '';
    // 2位数字补00：12 -> 1200
    if (numbers.length === 2) {
      numbers = numbers + '00';
    }
    // 3位数字补0：123 -> 1230
    else if (numbers.length === 3) {
      numbers = numbers + '0';
    }
    if (numbers.length !== 4) return '';
    // 验证有效性
    const hour = parseInt(numbers.substring(0, 2), 10);
    const minute = parseInt(numbers.substring(2, 4), 10);
    if (hour > 23 || minute > 59) return '';
    return numbers;
  },

  async submitAppointment() {
    const { shop, appointmentDateRaw, appointmentTimeRaw, deadlineDateRaw, deadlineTimeRaw, appointmentNote, maxParticipants, requirementOptions, customRequirement, paymentMode, isAnonymousInitiator } = this.data;

    // 验证店铺信息
    if (!shop || !shop._id) {
      wx.showToast({ title: '店铺信息异常，请刷新页面', icon: 'none' });
      return;
    }

    // 验证并格式化日期时间
    if (!appointmentDateRaw || !appointmentTimeRaw) {
      wx.showToast({ title: '请填写完整约饭时间', icon: 'none' });
      return;
    }
    if (!deadlineDateRaw || !deadlineTimeRaw) {
      wx.showToast({ title: '请填写完整截止时间', icon: 'none' });
      return;
    }

    // 使用当前年份
    const currentYear = new Date().getFullYear();

    // 解析为标准格式（处理3位数字等情况）
    console.log('原始时间值:', { appointmentDateRaw, appointmentTimeRaw, deadlineDateRaw, deadlineTimeRaw });
    const appointmentParsed = this.parseDateRaw(appointmentDateRaw);
    const timeParsed = this.parseTimeRaw(appointmentTimeRaw);
    const deadlineParsed = this.parseDateRaw(deadlineDateRaw);
    const deadlineTimeParsed = this.parseTimeRaw(deadlineTimeRaw);

    console.log('解析后时间值:', { appointmentParsed, timeParsed, deadlineParsed, deadlineTimeParsed });

    if (!appointmentParsed || !timeParsed || !deadlineParsed || !deadlineTimeParsed) {
      wx.showToast({ title: '时间格式无效，请重新输入', icon: 'none' });
      return;
    }

    // 构建完整时间字符串（明确指定东八区时区，避免服务端当作 UTC 解析）
    const appointmentMonth = appointmentParsed.substring(0, 2);
    const appointmentDay = appointmentParsed.substring(2, 4);
    const appointmentHour = timeParsed.substring(0, 2);
    const appointmentMinute = timeParsed.substring(2, 4);
    const fullAppointmentTime = `${currentYear}-${appointmentMonth}-${appointmentDay}T${appointmentHour}:${appointmentMinute}:00+08:00`;

    const deadlineMonth = deadlineParsed.substring(0, 2);
    const deadlineDay = deadlineParsed.substring(2, 4);
    const deadlineHour = deadlineTimeParsed.substring(0, 2);
    const deadlineMinute = deadlineTimeParsed.substring(2, 4);
    const fullDeadlineTime = `${currentYear}-${deadlineMonth}-${deadlineDay}T${deadlineHour}:${deadlineMinute}:00+08:00`;

    // 验证截止时间不能早于当前时间
    const now = new Date();
    if (new Date(fullDeadlineTime) <= now) {
      wx.showToast({ title: '截止时间不能早于当前时间', icon: 'none' });
      return;
    }

    if (new Date(fullDeadlineTime) >= new Date(fullAppointmentTime)) {
      wx.showToast({ title: '截止时间必须在约饭时间之前', icon: 'none' });
      return;
    }

    const requirements = requirementOptions
      .filter(item => item.selected && item.id !== 'custom')
      .map(item => item.name);

    wx.showLoading({ title: '提交中...' });

    try {
      // 内容安全检查：约饭备注和自定义要求
      const contentToCheck = [appointmentNote, customRequirement].filter(Boolean).join(' ');
      if (contentToCheck) {
        const isContentSafe = await checkContentWithToast(contentToCheck);
        if (!isContentSafe) {
          wx.hideLoading();
          return;
        }
      }
      const userInfo = wx.getStorageSync('userInfo') || {};
      const { result } = await wx.cloud.callFunction({
        name: 'createDiningAppointment',
        data: {
          shopId: shop._id,
          appointmentTime: fullAppointmentTime,
          deadline: fullDeadlineTime,
          note: appointmentNote,
          maxParticipants: parseInt(maxParticipants) || 0,
          requirements,
          customRequirement,
          paymentMode,
          isAnonymous: isAnonymousInitiator,
          initiatorName: userInfo.nickName || '',
          initiatorAvatar: userInfo.avatarUrl || ''
        }
      });

      console.log('createDiningAppointment 返回结果:', result);
      
      if (result.success) {
        wx.showToast({ title: '发起成功', icon: 'success' });
        this.closeAppointmentModal();
        this.loadAppointment(shop._id);
      } else {
        console.error('发起约饭失败:', result.error);
        wx.showToast({ title: result.error || '发起失败', icon: 'none', duration: 3000 });
      }
    } catch (err) {
      console.error('发起约饭异常:', err);
      wx.showToast({ title: '发起失败: ' + (err.message || '网络错误'), icon: 'none', duration: 3000 });
    } finally {
      wx.hideLoading();
    }
  },

  async onJoinAppointment() {
    const { appointment, isJoining } = this.data;
    if (isJoining) return; // 防止重复点击
    if (appointment.isJoined) return;
    if (appointment.remainingTime <= 0) return;
    if (appointment.isFull) return;

    this.setData({ isJoining: true });
    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'joinDiningAppointment',
        data: { appointmentId: appointment._id }
      });

      if (result.success) {
        wx.showToast({ title: '参加成功', icon: 'success' });
        // 延迟加载，避免频繁请求
        setTimeout(() => {
          this.loadAppointment(this.data.shop._id);
        }, 500);
      } else {
        wx.showToast({ title: result.error || '参加失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '参加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      this.setData({ isJoining: false });
    }
  },

  showParticipantName(e) {
    const { name } = e.currentTarget.dataset;
    const names = this.data.appointment.participants.map(p => p.name).join('、');
    this.setData({
      showParticipantNames: true,
      participantNames: names
    });
    setTimeout(() => this.setData({ showParticipantNames: false }), 3000);
  },

  showRatingModal() {
    this.setData({
      showRatingModal: true,
      ratingStars: 0,
      ratingComment: ''
    });
  },

  closeRatingModal() {
    this.setData({ showRatingModal: false });
  },

  selectRating(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ ratingStars: parseInt(index) + 1 });
  },

  onRatingCommentInput(e) {
    this.setData({ ratingComment: e.detail.value });
  },

  async submitRating() {
    const { appointment, ratingStars, ratingComment } = this.data;
    if (ratingStars === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    // 内容安全检查：评价内容
    if (ratingComment && ratingComment.trim()) {
      const isContentSafe = await checkContentWithToast(ratingComment.trim());
      if (!isContentSafe) {
        return;
      }
    }

    wx.showLoading({ title: '提交中...' });
    try {
      await wx.cloud.callFunction({
        name: 'rateDiningAppointment',
        data: {
          appointmentId: appointment._id,
          stars: ratingStars,
          comment: ratingComment
        }
      });
      wx.showToast({ title: '评价成功', icon: 'success' });
      this.closeRatingModal();
      this.loadAppointment(this.data.shop._id);
    } catch (err) {
      wx.showToast({ title: '评价失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 打开平台链接
  openPlatformLink() {
    const { shop } = this.data;
    if (!shop.platformUrl) {
      wx.showToast({ title: '暂无平台链接', icon: 'none' });
      return;
    }

    // 判断链接类型
    const url = shop.platformUrl;
    
    // 如果是美团小程序链接，尝试跳转
    if (url.includes('meituan')) {
      // 美团小程序 scheme
      wx.navigateToMiniProgram({
        appId: 'wxde8ac0a21135c07d', // 美团外卖小程序 appid
        path: url.replace('https://', ''),
        success: () => {
        },
        fail: (err) => {
          // 失败时复制链接
          this.copyAndOpenLink(url, '美团');
        }
      });
    } else if (url.includes('dianping')) {
      // 大众点评小程序 scheme
      wx.navigateToMiniProgram({
        appId: 'wx734c1ad7b3562129', // 大众点评小程序 appid
        path: url.replace('https://', ''),
        success: () => {
        },
        fail: (err) => {
          this.copyAndOpenLink(url, '大众点评');
        }
      });
    } else if (url.includes('jd')) {
      // 京东小程序 scheme
      wx.navigateToMiniProgram({
        appId: 'wx91d27dbf599dff74', // 京东小程序 appid
        path: url.replace('https://', ''),
        success: () => {
        },
        fail: (err) => {
          this.copyAndOpenLink(url, '京东');
        }
      });
    } else {
      // 其他链接，复制到剪贴板
      this.copyAndOpenLink(url, '店铺');
    }
  },

  // 复制链接并提示用户
  copyAndOpenLink(url, platformName) {
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showModal({
          title: '链接已复制',
          content: `${platformName}链接已复制到剪贴板。由于平台限制，请手动打开${platformName}App或浏览器查看。`,
          showCancel: false,
          confirmText: '知道了'
        });
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' });
      }
    });
  },

  // 检查用户是否可以评分（去过该店铺但未评分）
  checkCanRateShop(shop) {
    // 如果用户没有登录，不能评分
    if (!this.data.openId) return false;
    
    // 如果用户是店铺推荐人，且已经评分了，不需要再显示评分按钮
    if (shop.recommenderOpenId === this.data.openId) return false;
    
    // 检查用户是否已经在追加推荐人列表中（已经评分过）
    const hasRated = shop.additionalRecommenders && 
      shop.additionalRecommenders.some(r => r.openId === this.data.openId);
    
    // 如果已经评分过，不显示评分按钮
    if (hasRated) return false;
    
    // 检查用户是否参加过该店铺的约饭活动
    // 这里简化处理，实际应该查询用户的约饭记录
    // 暂时返回 false，需要配合实际的约饭记录查询
    return false;
  },

  // 显示店铺评分弹窗
  showShopRatingModal() {
    this.setData({
      showShopRating: true,
      shopRatingStars: 0,
      shopRatingComment: ''
    });
  },

  // 选择店铺评分星级
  selectShopRating(e) {
    const stars = parseInt(e.currentTarget.dataset.stars);
    this.setData({ shopRatingStars: stars });
  },

  // 输入店铺评分评论
  inputShopRatingComment(e) {
    this.setData({ shopRatingComment: e.detail.value });
  },

  // 关闭店铺评分弹窗
  closeShopRatingModal() {
    this.setData({ showShopRating: false });
  },

  // 提交店铺评分
  async submitShopRating() {
    const { shopRatingStars, shopRatingComment, shop } = this.data;
    
    if (shopRatingStars === 0) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });
      
      const result = await wx.cloud.callFunction({
        name: 'rateShop',
        data: {
          shopId: shop._id,
          stars: shopRatingStars,
          comment: shopRatingComment
        }
      });

      if (result.result.success) {
        wx.showToast({ title: '评价成功', icon: 'success' });
        this.setData({ 
          showShopRating: false,
          canRateShop: false
        });
        // 刷新店铺详情
        this.loadShopDetail();
      } else {
        throw new Error(result.result.error || '评价失败');
      }
    } catch (err) {
      wx.showToast({ title: err.message || '评价失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取当前用户信息
  loadCurrentUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      if (userInfo.avatarUrl) {
        this.setData({ userInfo });
      } else {
        // 尝试从全局获取
        const app = getApp();
        if (app.globalData && app.globalData.userInfo) {
          this.setData({ userInfo: app.globalData.userInfo });
        }
      }
    } catch (e) {
      console.log('获取用户信息失败', e);
    }
  },

  // ========== 弹幕事件处理 ==========
  onDanmakuSend(e) {
    const { text, style } = e.detail;
    console.log('用户发送弹幕:', text, '风格:', style);
  },

  // 弹幕暂停/恢复切换
  onDanmakuToggle(e) {
    const { paused } = e.detail;
    if (paused) {
      console.log('[弹幕] 已暂停');
    } else {
      console.log('[弹幕] 已恢复');
    }
  }

});
