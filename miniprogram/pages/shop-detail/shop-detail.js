const app = getApp();

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
    shop: null,
    loading: true,
    currentImageIndex: 0,
    // 收藏状态
    isFavorited: false,
    // 是否店铺发起者
    isShopOwner: false,
    // 约饭相关
    appointment: null,
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
    appointmentYearIndex: 0,
    appointmentMonth: '',
    appointmentMonthIndex: 0,
    appointmentDay: '',
    appointmentDayIndex: 0,
    appointmentHour: '',
    appointmentHourIndex: 0,
    appointmentMinute: '',
    appointmentMinuteIndex: 0,
    // 截止时间选择
    deadlineYear: '2026',
    deadlineYearIndex: 0,
    deadlineMonth: '',
    deadlineMonthIndex: 0,
    deadlineDay: '',
    deadlineDayIndex: 0,
    deadlineHour: '',
    deadlineHourIndex: 0,
    deadlineMinute: '',
    deadlineMinuteIndex: 0,
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
    // 发起者操作菜单
    showOwnerActions: false
  },

  onLoad(options) {
    const { id, openAppointment } = options;
    if (id) {
      this.initTimePicker();
      this.loadShopDetail(id);
      this.loadAppointment(id);
      this.loadHistoryAppointments(id);
      
      // 如果传入openAppointment参数，自动打开约饭弹窗
      if (openAppointment === '1') {
        // 等待店铺数据加载完成后再打开弹窗
        const checkShopLoaded = setInterval(() => {
          if (this.data.shop) {
            clearInterval(checkShopLoaded);
            this.onCreateAppointment();
          }
        }, 100);
        // 5秒后停止检查
        setTimeout(() => clearInterval(checkShopLoaded), 5000);
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

  // 初始化时间选择器 - 设置为当前时间
  initTimePicker() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    this.setData({
      // 约饭时间默认当前时间
      appointmentYear: '2026',
      appointmentYearIndex: 0,
      appointmentMonth: (currentMonth < 10 ? '0' : '') + currentMonth,
      appointmentMonthIndex: currentMonth - 1,
      appointmentDay: (currentDay < 10 ? '0' : '') + currentDay,
      appointmentDayIndex: currentDay - 1,
      appointmentHour: (currentHour < 10 ? '0' : '') + currentHour,
      appointmentHourIndex: currentHour,
      appointmentMinute: (currentMinute < 10 ? '0' : '') + currentMinute,
      appointmentMinuteIndex: currentMinute,
      // 截止时间默认当前时间
      deadlineYear: '2026',
      deadlineYearIndex: 0,
      deadlineMonth: (currentMonth < 10 ? '0' : '') + currentMonth,
      deadlineMonthIndex: currentMonth - 1,
      deadlineDay: (currentDay < 10 ? '0' : '') + currentDay,
      deadlineDayIndex: currentDay - 1,
      deadlineHour: (currentHour < 10 ? '0' : '') + currentHour,
      deadlineHourIndex: currentHour,
      deadlineMinute: (currentMinute < 10 ? '0' : '') + currentMinute,
      deadlineMinuteIndex: currentMinute
    });
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
        this.setData({ 
          shop, 
          loading: false,
          isShopOwner: result.isOwner || false
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
    this.setData({
      showEditShopModal: true,
      editShopName: shop.name || '',
      editShopAddress: shop.address || '',
      editShopReason: shop.reason || '',
      editShopTips: shop.tips || ''
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

  // 提交编辑店铺
  async submitEditShop() {
    const { shop, editShopName, editShopAddress, editShopReason, editShopTips } = this.data;
    
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
          tips: editShopTips
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

      if (result.success && result.appointments.length > 0) {
        const appointment = result.appointments[0];
        const isInitiator = appointment.initiatorOpenId === result.openid;
        
        this.setData({
          appointment: {
            ...appointment,
            appointmentTimeStr: this.formatDateTime(appointment.appointmentTime),
            deadlineStr: this.formatDateTime(appointment.deadline),
            countdownText: this.formatCountdown(appointment.remainingTime),
            isFull: appointment.maxParticipants > 0 && appointment.participants.length >= appointment.maxParticipants
          },
          isInitiator
        });

        this.startCountdown(appointment);
      }
    } catch (err) {
      console.error('加载约饭报名失败:', err);
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
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
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
      requirementOptions: [
        { id: 'noAlcohol', name: '不喝酒', selected: false },
        { id: 'noSmoking', name: '不吸烟', selected: false },
        { id: 'quiet', name: '安静环境', selected: false },
        { id: 'custom', name: '自定义', selected: false }
      ]
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
    this.setData({ appointmentYear: value }, this.updateAppointmentTime);
  },
  onAppointmentMonthInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 12) value = '12';
    this.setData({ appointmentMonth: value }, this.updateAppointmentTime);
  },
  onAppointmentDayInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 31) value = '31';
    this.setData({ appointmentDay: value }, this.updateAppointmentTime);
  },
  onAppointmentHourInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 23) value = '23';
    this.setData({ appointmentHour: value }, this.updateAppointmentTime);
  },
  onAppointmentMinuteInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 59) value = '59';
    this.setData({ appointmentMinute: value }, this.updateAppointmentTime);
  },

  // 截止时间输入
  onDeadlineYearInput(e) {
    let value = e.detail.value;
    if (value.length > 4) value = value.slice(0, 4);
    this.setData({ deadlineYear: value }, this.updateDeadlineTime);
  },
  onDeadlineMonthInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 12) value = '12';
    this.setData({ deadlineMonth: value }, this.updateDeadlineTime);
  },
  onDeadlineDayInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 31) value = '31';
    this.setData({ deadlineDay: value }, this.updateDeadlineTime);
  },
  onDeadlineHourInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 23) value = '23';
    this.setData({ deadlineHour: value }, this.updateDeadlineTime);
  },
  onDeadlineMinuteInput(e) {
    let value = e.detail.value;
    if (value.length > 2) value = value.slice(0, 2);
    if (parseInt(value) > 59) value = '59';
    this.setData({ deadlineMinute: value }, this.updateDeadlineTime);
  },

  // 更新约饭时间
  updateAppointmentTime() {
    const { appointmentYear, appointmentMonth, appointmentDay, appointmentHour, appointmentMinute } = this.data;
    if (appointmentYear && appointmentMonth && appointmentDay && appointmentHour !== '' && appointmentMinute !== '') {
      const month = appointmentMonth.padStart(2, '0');
      const day = appointmentDay.padStart(2, '0');
      const hour = appointmentHour.toString().padStart(2, '0');
      const minute = appointmentMinute.toString().padStart(2, '0');
      this.setData({
        appointmentTime: `${appointmentYear}-${month}-${day}T${hour}:${minute}:00`
      });
    }
  },

  // 更新截止时间
  updateDeadlineTime() {
    const { deadlineYear, deadlineMonth, deadlineDay, deadlineHour, deadlineMinute } = this.data;
    if (deadlineYear && deadlineMonth && deadlineDay && deadlineHour !== '' && deadlineMinute !== '') {
      const month = deadlineMonth.padStart(2, '0');
      const day = deadlineDay.padStart(2, '0');
      const hour = deadlineHour.toString().padStart(2, '0');
      const minute = deadlineMinute.toString().padStart(2, '0');
      this.setData({
        deadlineTime: `${deadlineYear}-${month}-${day}T${hour}:${minute}:00`
      });
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
    const { shop, appointmentTime, deadlineTime, appointmentNote, maxParticipants, requirementOptions, customRequirement, paymentMode } = this.data;

    if (!appointmentTime || !deadlineTime) {
      wx.showToast({ title: '请填写完整时间', icon: 'none' });
      return;
    }

    if (new Date(deadlineTime) >= new Date(appointmentTime)) {
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
          appointmentTime,
          deadline: deadlineTime,
          note: appointmentNote,
          maxParticipants: parseInt(maxParticipants) || 0,
          requirements,
          customRequirement,
          paymentMode
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
    const { appointment } = this.data;
    if (appointment.isJoined) return;
    if (appointment.remainingTime <= 0) return;
    if (appointment.isFull) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'joinDiningAppointment',
        data: { appointmentId: appointment._id }
      });

      if (result.success) {
        wx.showToast({ title: '参加成功', icon: 'success' });
        this.loadAppointment(this.data.shop._id);
      } else {
        wx.showToast({ title: result.error || '参加失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '参加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
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
  }
});
