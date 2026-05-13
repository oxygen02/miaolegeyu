const { imagePaths } = require('../../../config/imageConfig');
const { HOLIDAY_CONFIG } = require('../../../config/holidayConfig');

Page({
  data: {
    imagePaths,
    title: '',
    description: '',
    // 候选日期（未来14天）
    candidateDates: [],
    selectedDates: [],
    // 时间范围（中午/晚上）
    timeRange: { lunch: '12:00-14:00', dinner: '18:00-21:00' },
    timePeriod: 'lunch', // lunch=中午, dinner=晚上
    minParticipants: 2,
    // 截止时间（默认3天后）
    deadlineDate: '',
    deadlineTime: '12:00',
    // 弹窗状态
    showDateModal: false,
    showTimeModal: false,
    // 时间选项
    timeOptions: [
      '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
      '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
      '21:00', '22:00', '23:00'
    ],
    // 截止日期选项
    deadlineDateOptions: [],
    // 匿名投票
    anonymous: true,
    loading: false
  },

  onLoad() {
    // 重置状态，防止缓存数据
    this.setData({
      selectedDates: [],
      title: '',
      description: '',
      minParticipants: 2,
      deadlineDate: '',
      deadlineTime: '12:00'
    });
    this.initDates();
    this.initDeadline();
  },

  // 初始化候选日期（未来14天）
  initDates() {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dayOfWeek = d.getDay(); // 0=周日, 6=周六
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];
      const fullDate = `${year}-${month}-${day}`;

      // 判断日期类型
      let dateType = 'normal';
      let dateTag = '';
      if (HOLIDAY_CONFIG.holidayDates.includes(fullDate)) {
        dateType = 'holiday';
        dateTag = '休';
      } else if (HOLIDAY_CONFIG.workdaySwapDates.includes(fullDate)) {
        dateType = 'workday';
        dateTag = '班';
      } else if (dayOfWeek === 6) {
        dateType = 'saturday';
      } else if (dayOfWeek === 0) {
        dateType = 'sunday';
      }

      dates.push({
        fullDate,
        monthDay: `${month}/${day}`,
        weekDay,
        isToday: i === 0,
        dateType,
        dateTag,
        isSelected: false
      });
    }
    this.setData({ candidateDates: dates });
  },

  // 初始化截止时间（3天后12:00）
  initDeadline() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const deadline = `${year}-${month}-${day}`;
    console.log('initDeadline:', deadline);
    this.setData({ deadlineDate: deadline });
  },

  // 输入活动主题
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  // 输入描述
  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  // 选择/取消日期
  toggleDate(e) {
    const { date } = e.currentTarget.dataset;
    const selected = [...this.data.selectedDates];
    const idx = selected.indexOf(date);
    let isSelecting = false;

    if (idx >= 0) {
      selected.splice(idx, 1);
    } else {
      if (selected.length >= 7) {
        wx.showToast({ title: '最多选7天', icon: 'none' });
        return;
      }
      selected.push(date);
      isSelecting = true;
    }

    // 同步更新 candidateDates 的 isSelected 状态
    const candidateDates = this.data.candidateDates.map(item => {
      if (item.fullDate === date) {
        return { ...item, isSelected: isSelecting };
      }
      return item;
    });

    this.setData({
      selectedDates: selected.sort(),
      candidateDates
    });
  },

  // 切换时段（中午/晚上）
  togglePeriod() {
    this.setData({
      timePeriod: this.data.timePeriod === 'lunch' ? 'dinner' : 'lunch'
    });
  },

  // 切换匿名
  toggleAnonymous() {
    this.setData({ anonymous: !this.data.anonymous });
  },

  // 显示日期选择器
  showDatePicker() {
    console.log('showDatePicker called, deadlineDate:', this.data.deadlineDate);
    const options = this.generateDateOptions();
    console.log('date options:', options);
    this.setData({ 
      showDateModal: true,
      deadlineDateOptions: options
    });
  },

  // 选择日期
  selectDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ 
      deadlineDate: date,
      showDateModal: false 
    });
  },

  // 关闭日期弹窗
  closeDateModal() {
    this.setData({ showDateModal: false });
  },

  // 显示时间选择器
  showTimePicker() {
    console.log('showTimePicker called');
    this.setData({ showTimeModal: true });
  },

  // 选择时间
  selectTime(e) {
    const time = e.currentTarget.dataset.time;
    this.setData({ 
      deadlineTime: time,
      showTimeModal: false 
    });
  },

  // 关闭时间弹窗
  closeTimeModal() {
    this.setData({ showTimeModal: false });
  },

  // 弹窗内部点击（阻止事件冒泡）
  onModalTap() {
    // 空函数，用于阻止点击事件冒泡到遮罩层
  },

  // 生成日期选项列表
  generateDateOptions() {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
      options.push({
        value: `${year}-${month}-${day}`,
        label: `${month}/${day} ${dayOfWeek}`,
        isToday: i === 0
      });
    }
    return options;
  },

  // 截止时间日期变化（兼容旧版）
  onDeadlineDateChange(e) {
    this.setData({ deadlineDate: e.detail.value });
  },

  // 截止时间时间变化（兼容旧版）
  onDeadlineTimeChange(e) {
    this.setData({ deadlineTime: e.detail.value });
  },

  // 减少最低参与人数
  onMinParticipantsMinus() {
    const current = this.data.minParticipants;
    if (current > 2) {
      this.setData({ minParticipants: current - 1 });
    }
  },

  // 增加最低参与人数
  onMinParticipantsPlus() {
    const current = this.data.minParticipants;
    if (current < 20) {
      this.setData({ minParticipants: current + 1 });
    }
  },

  // 创建投票
  async createVote() {
    const { title, selectedDates, timeRange, timePeriod, minParticipants, deadlineDate, deadlineTime, anonymous } = this.data;

    if (!title.trim()) {
      wx.showToast({ title: '请输入活动主题', icon: 'none' });
      return;
    }
    if (selectedDates.length === 0) {
      wx.showToast({ title: '请至少选择一天', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const deadline = `${deadlineDate}T${deadlineTime}:00`;
      // 确保 timeRange 格式正确
      const safeTimeRange = {
        lunch: (timeRange && timeRange.lunch) || '12:00-14:00',
        dinner: (timeRange && timeRange.dinner) || '18:00-21:00'
      };
      const { result } = await wx.cloud.callFunction({
        name: 'createScheduleVote',
        data: {
          title: title.trim(),
          description: (this.data.description || '').trim(),
          candidateDates: selectedDates,
          timeRange: safeTimeRange,
          timePeriod: timePeriod || 'lunch',
          minParticipants: minParticipants || 2,
          deadline,
          anonymous
        }
      });

      if (result.success) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        // 跳转到填写页面，让创建者也填写自己的时间
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/schedule-vote/fill/fill?voteId=${result.voteId}&title=${encodeURIComponent(title)}`
          });
        }, 500);
      } else {
        wx.showToast({ title: result.error || '创建失败', icon: 'none' });
      }
    } catch (err) {
      wx.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
