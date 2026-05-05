const app = getApp();
const { imagePaths } = require('../../config/imageConfig');

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
    imagePaths: imagePaths,
    shop: null,
    loading: true,
    currentImageIndex: 0,
    // 收藏状态
    isFavorited: false,
    // 是否店铺发起者
    isShopOwner: false,
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
    // 约饭时间选择
    appointmentYear: '2026',
    appointmentDate: '',
    appointmentTime: '',
    // 截止时间选择
    deadlineYear: '2026',
    deadlineDate: '',
    deadlineTime: '',
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
    const { id, openAppointment } = options;
    if (id) {
      this.initTimePicker();
      // 先加载店铺详情，确保页面基本数据加载完成
      await this.loadShopDetail(id);
      // 然后并行加载约饭相关数据
      await Promise.all([
        this.loadAppointment(id),
        this.loadHistoryAppointments(id)
      ]);
      
      // 如果传入openAppointment参数，自动打开约饭弹窗
      if (openAppointment === '1') {
        if (this.data.shop) {
          this.onCreateAppointment();
        }
      }
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

  // 初始化时间选择器 - 设置为空，让用户自行输入
  initTimePicker() {
    this.setData({
      // 约饭时间默认空
      appointmentYear: '2026',
      appointmentDate: '',
      appointmentTime: '',
      // 截止时间默认空
      deadlineYear: '2026',
      deadlineDate: '',
      deadlineTime: ''
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
      console.error('加载店铺详情失败:', err);
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
      console.error('检查收藏状态失败:', err);
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
      console.error('收藏操作失败:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 分享功能
  onShareAppMessage() {
    const { shop } = this.data;
    return {
      title: `${shop.name} - 喵了个鱼美食推荐`,
      path: `/pages/shop-detail/shop-detail?id=${shop._id}`,
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

    // 打开地图选择导航
    wx.showActionSheet({
      itemList: ['使用腾讯地图导航', '复制地址'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 使用腾讯地图
          wx.openLocation({
            name: name || '目的地',
            address: address,
            latitude: 0,
            longitude: 0,
            fail: () => {
              wx.showToast({ title: '无法打开地图', icon: 'none' });
            }
          });
        } else if (res.tapIndex === 1) {
          // 复制地址
          wx.setClipboardData({
            data: address,
            success: () => {
              wx.showToast({ title: '地址已复制', icon: 'success' });
            }
          });
        }
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
      console.error('修改店铺失败:', err);
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
        console.error('删除店铺失败:', err);
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

        // 计算剩余时间
        const deadline = new Date(appointment.deadline);
        const now = new Date();
        const remainingTime = deadline.getTime() - now.getTime();
        appointment.remainingTime = remainingTime > 0 ? remainingTime : 0;

        this.setData({
          appointment: {
            ...appointment,
            appointmentTimeStr: this.formatDateTime(appointment.appointmentTime),
            deadlineStr: this.formatDateTime(appointment.deadline),
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
      console.error('加载约饭报名失败:', err);
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
      console.error('加载历史组团失败:', err);
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

  formatDateTime(dateStr) {
    // 处理 ISO 格式时间字符串，确保正确解析本地时间
    let date;
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
      // 将 ISO 格式转换为本地时间
      const parts = dateStr.split('T');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1] ? parts[1].split(':') : ['00', '00', '00'];
      date = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
        parseInt(timeParts[2]) || 0
      );
    } else {
      date = new Date(dateStr);
    }
    // 转换为北京时间 UTC+8
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const month = (beijingDate.getUTCMonth() + 1 < 10 ? '0' : '') + (beijingDate.getUTCMonth() + 1);
    const day = (beijingDate.getUTCDate() < 10 ? '0' : '') + beijingDate.getUTCDate();
    const hour = (beijingDate.getUTCHours() < 10 ? '0' : '') + beijingDate.getUTCHours();
    const minute = (beijingDate.getUTCMinutes() < 10 ? '0' : '') + beijingDate.getUTCMinutes();
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
    const { shop } = this.data;
    
    // 如果有平台链接，直接跳转到平台详情
    if (shop.platformUrl) {
      this.openPlatformLink();
      return;
    }
    
    // 否则预览图片
    wx.previewImage({ current: url, urls: this.data.shop.images });
  },

  // 点击发起约饭
  onCreateAppointment() {
    this.initTimePicker(); // 初始化时间选择器
    this.setData({
      showAppointmentModal: true,
      appointmentTime: '',
      deadlineTime: '',
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

  // 约饭时间输入
  onAppointmentYearInput(e) {
    let value = e.detail.value;
    if (value.length > 4) value = value.slice(0, 4);
    this.setData({ appointmentYear: value });
  },
  onAppointmentDateInput(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    // 3位数字时自动补零（如428 -> 0428）
    if (value.length === 3) {
      value = '0' + value;
    }
    // 限制4位
    if (value.length > 4) value = value.substring(0, 4);
    this.setData({ appointmentDate: value });
  },
  onAppointmentTimeInput(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    this.setData({ appointmentTime: value });
  },

  // 约饭时间输入完成 - 2位数字自动补全为整点
  onAppointmentTimeBlur(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    // 如果输入2位数字，自动补全为整点（如18 -> 1800）
    if (value.length === 2) {
      value = value + '00';
      this.setData({ appointmentTime: value });
    }
  },

  // 清空约饭时间
  clearAppointmentTime() {
    this.setData({
      appointmentYear: '2026',
      appointmentDate: '',
      appointmentTime: ''
    });
  },

  // 清空截止时间
  clearDeadlineTime() {
    this.setData({
      deadlineYear: '2026',
      deadlineDate: '',
      deadlineTime: ''
    });
  },

  // 截止时间输入
  onDeadlineYearInput(e) {
    let value = e.detail.value;
    if (value.length > 4) value = value.slice(0, 4);
    this.setData({ deadlineYear: value });
  },
  onDeadlineDateInput(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    // 3位数字时自动补零（如428 -> 0428）
    if (value.length === 3) {
      value = '0' + value;
    }
    // 限制4位
    if (value.length > 4) value = value.substring(0, 4);
    this.setData({ deadlineDate: value });
  },
  onDeadlineTimeInput(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    if (value.length > 4) value = value.substring(0, 4);
    this.setData({ deadlineTime: value });
  },

  // 截止时间输入完成 - 2位数字自动补全为整点
  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    // 只保留数字
    value = value.replace(/\D/g, '');
    // 如果输入2位数字，自动补全为整点（如18 -> 1800）
    if (value.length === 2) {
      value = value + '00';
      this.setData({ deadlineTime: value });
    }
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
    const inputDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    const now = new Date();
    
    // 检查是否早于当前时间
    if (inputDate <= now) {
      wx.showToast({ title: '约饭时间必须晚于当前时间', icon: 'none' });
      return;
    }
    
    // 保存标准格式
    this.setData({ 
      appointmentTime: `${year}-${month}-${day}T${hour}:${minute}:00`,
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
    const inputDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
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
    
    // 保存标准格式
    this.setData({ 
      deadlineTime: `${year}-${month}-${day}T${hour}:${minute}:00`,
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

  async submitAppointment() {
    const { shop, appointmentYear, appointmentDate, appointmentTime, deadlineYear, deadlineDate, deadlineTime, appointmentNote, maxParticipants, requirementOptions, customRequirement, paymentMode, isAnonymousInitiator } = this.data;

    // 验证并格式化日期时间
    if (!appointmentYear || !appointmentDate || !appointmentTime) {
      wx.showToast({ title: '请填写完整约饭时间', icon: 'none' });
      return;
    }
    if (!deadlineYear || !deadlineDate || !deadlineTime) {
      wx.showToast({ title: '请填写完整截止时间', icon: 'none' });
      return;
    }

    // 格式化日期（支持3位自动补零）
    const formattedAppointmentDate = appointmentDate.length === 3 ? '0' + appointmentDate : appointmentDate;
    const formattedDeadlineDate = deadlineDate.length === 3 ? '0' + deadlineDate : deadlineDate;

    // 构建完整时间字符串
    const appointmentMonth = formattedAppointmentDate.substring(0, 2);
    const appointmentDay = formattedAppointmentDate.substring(2, 4);
    const appointmentHour = appointmentTime.substring(0, 2);
    const appointmentMinute = appointmentTime.substring(2, 4);
    const fullAppointmentTime = `${appointmentYear}-${appointmentMonth}-${appointmentDay}T${appointmentHour}:${appointmentMinute}:00`;

    const deadlineMonth = formattedDeadlineDate.substring(0, 2);
    const deadlineDay = formattedDeadlineDate.substring(2, 4);
    const deadlineHour = deadlineTime.substring(0, 2);
    const deadlineMinute = deadlineTime.substring(2, 4);
    const fullDeadlineTime = `${deadlineYear}-${deadlineMonth}-${deadlineDay}T${deadlineHour}:${deadlineMinute}:00`;

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
          isAnonymous: isAnonymousInitiator
        }
      });

      if (result.success) {
        wx.showToast({ title: '发起成功', icon: 'success' });
        this.closeAppointmentModal();
        this.loadAppointment(shop._id);
      } else {
        wx.showToast({ title: result.error || '发起失败', icon: 'none' });
      }
    } catch (err) {
      console.error('发起约饭失败:', err);
      wx.showToast({ title: '发起失败', icon: 'none' });
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

  onShareAppMessage() {
    const { shop } = this.data;
    return {
      title: `${shop.name} - 喵了个鱼美食推荐`,
      path: `/pages/shop-detail/shop-detail?id=${shop._id}`
    };
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
          console.log('跳转美团小程序成功');
        },
        fail: (err) => {
          console.error('跳转美团小程序失败:', err);
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
          console.log('跳转大众点评小程序成功');
        },
        fail: (err) => {
          console.error('跳转大众点评小程序失败:', err);
          this.copyAndOpenLink(url, '大众点评');
        }
      });
    } else if (url.includes('jd')) {
      // 京东小程序 scheme
      wx.navigateToMiniProgram({
        appId: 'wx91d27dbf599dff74', // 京东小程序 appid
        path: url.replace('https://', ''),
        success: () => {
          console.log('跳转京东小程序成功');
        },
        fail: (err) => {
          console.error('跳转京东小程序失败:', err);
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
      console.error('评价失败:', err);
      wx.showToast({ title: err.message || '评价失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
