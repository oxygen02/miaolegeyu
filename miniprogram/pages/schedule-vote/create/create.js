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
      minParticipants: 2
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
    this.setData({ deadlineDate: `${year}-${month}-${day}` });
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

  // 截止时间日期变化
  onDeadlineDateChange(e) {
    this.setData({ deadlineDate: e.detail.value });
  },

  // 截止时间时间变化
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
      console.error('创建失败:', err);
      wx.showToast({ title: '创建失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
