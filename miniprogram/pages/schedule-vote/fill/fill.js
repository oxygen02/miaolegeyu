const { imagePaths } = require('../../../config/imageConfig');
const { HOLIDAY_CONFIG } = require('../../../config/holidayConfig');

// 级别定义：0=冲突 1=不定 2=可以 3=首选
const LEVELS = [
  { value: 0, label: '冲突', class: 'level-conflict' },
  { value: 1, label: '不定', class: 'level-uncertain' },
  { value: 2, label: '可以', class: 'level-ok' },
  { value: 3, label: '首选', class: 'level-best' }
];

const MIN_REQUIRED_DATES = 2;

Page({
  data: {
    imagePaths,
    voteId: '',
    title: '',
    voteData: null,
    loading: true,
    submitting: false,
    weeks: [],
    levels: LEVELS,
    // 每个日期的状态 { "2026-05-08": null } 未选中
    dateStates: {},
    // 每个日期的冲突信息 { "2026-05-08": [{ title, type, time }] }
    dateConflicts: {},
    MIN_REQUIRED_DATES,
    filledCount: 0,
    // 冲突提示弹窗
    showConflictModal: false,
    conflictModalData: null,
    // 待处理的选中操作（用户确认后执行）
    pendingSelect: null
  },

  onLoad(options) {
    const { voteId, title } = options;
    this.setData({ voteId, title: title || '时间投票' });
    if (voteId) {
      this.loadVoteData(voteId);
    }
  },

  // 加载投票数据
  async loadVoteData(voteId) {
    this.setData({ loading: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getScheduleVote',
        data: { voteId }
      });

      if (result.success) {
        const vote = result.vote;
        const weeks = this.generateWeeks(vote.candidateDates);
        const dateStates = this.generateDateStates(vote.candidateDates);

        this.setData({
          voteData: vote,
          weeks,
          dateStates
        });

        // 恢复已提交数据
        if (result.myParticipation) {
          this.restoreParticipation(result.myParticipation, weeks);
        }

        this.updateSummary();

        // 检查时间冲突
        this.checkConflicts(vote.candidateDates);

      } else {
        wx.showToast({ title: result.error || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 检查时间冲突
  async checkConflicts(dates) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'checkScheduleConflict',
        data: {
          dates,
          excludeVoteId: this.data.voteId
        }
      });

      if (result.success && result.conflicts.length > 0) {
        // 按日期整理冲突
        const dateConflicts = {};
        result.conflicts.forEach(conflict => {
          // 冲突可能有单个日期或多个日期（用、分隔）
          const conflictDates = conflict.date.split('、');
          conflictDates.forEach(d => {
            if (!dateConflicts[d]) dateConflicts[d] = [];
            dateConflicts[d].push(conflict);
          });
        });

        this.setData({ dateConflicts });
      }
    } catch (err) {
      console.error('冲突检查失败:', err);
      // 冲突检查失败不影响正常使用
    }
  },

  // 生成日期数据
  generateWeeks(dates) {
    return dates.map((dateStr, index) => {
      const d = new Date(dateStr);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const dayOfWeek = d.getDay();
      const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];

      let dateType = 'normal';
      let dateTag = '';
      if (HOLIDAY_CONFIG.holidayDates.includes(dateStr)) {
        dateType = 'holiday';
        dateTag = '休';
      } else if (HOLIDAY_CONFIG.workdaySwapDates.includes(dateStr)) {
        dateType = 'workday';
        dateTag = '班';
      } else if (dayOfWeek === 6) {
        dateType = 'saturday';
      } else if (dayOfWeek === 0) {
        dateType = 'sunday';
      }

      return {
        date: dateStr,
        monthDay: `${month}/${day}`,
        weekDay,
        label: `${month}月${day}日 周${weekDay}`,
        dateType,
        dateTag,
        index
      };
    });
  },

  // 初始化所有日期为未选中(null)
  generateDateStates(dates) {
    const dateStates = {};
    dates.forEach(date => {
      dateStates[date] = null;
    });
    return dateStates;
  },

  // 恢复已提交数据
  restoreParticipation(participation, weeks) {
    const dateStates = { ...this.data.dateStates };

    if (participation.matrix && typeof participation.matrix === 'object') {
      Object.keys(participation.matrix).forEach(date => {
        if (dateStates[date] !== undefined) {
          const val = Number(participation.matrix[date]);
          if (val >= 0 && val <= 3) {
            dateStates[date] = val;
          }
        }
      });
    } else if (participation.availability && typeof participation.availability === 'object') {
      const { availability = {}, preferredSlots = [] } = participation;
      weeks.forEach(w => {
        const date = w.date;
        const times = availability[date];
        const hasPreferred = preferredSlots.some(key => key.startsWith(date + '_'));

        if (times && times.length > 0) {
          if (hasPreferred) dateStates[date] = 3;
          else dateStates[date] = 2;
        }
      });
    }

    this.setData({ dateStates });
  },

  // 选择/取消级别
  selectLevel(e) {
    const { date, level } = e.currentTarget.dataset;
    const dateStates = { ...this.data.dateStates };
    const current = dateStates[date];
    const targetLevel = Number(level);

    // 如果点击已选中的，直接取消（不需要确认）
    if (current === targetLevel) {
      dateStates[date] = null;
      this.setData({ dateStates });
      this.updateSummary();
      return;
    }

    // 如果要选中的级别不是冲突(0)，且该日期有冲突记录，提示用户
    if (targetLevel > 0) {
      const conflicts = this.data.dateConflicts[date];
      if (conflicts && conflicts.length > 0) {
        // 弹出冲突提示
        this.showConflictTip(date, targetLevel, conflicts);
        return;
      }
    }

    // 直接选中
    dateStates[date] = targetLevel;
    this.setData({ dateStates });
    this.updateSummary();
  },

  // 显示冲突提示
  showConflictTip(date, targetLevel, conflicts) {
    const dateInfo = this.data.weeks.find(w => w.date === date);
    const dateLabel = dateInfo ? dateInfo.label : date;

    // 构建提示内容
    let content = `该日期您已有以下安排：\n`;
    conflicts.forEach((c, i) => {
      const typeText = c.type === 'room' ? '聚餐' : '投票';
      const roleText = c.isCreator ? '（发起）' : '（参与）';
      content += `${i + 1}. ${c.title}${roleText}`;
      if (c.time) content += ` ${c.time}`;
      if (c.location) content += ` @${c.location}`;
      content += '\n';
    });
    content += '\n仍要标记该日期为可用吗？';

    wx.showModal({
      title: `${dateLabel} 时间冲突`,
      content,
      confirmText: '仍要标记',
      cancelText: '先不选',
      confirmColor: '#FF9F43',
      success: (res) => {
        if (res.confirm) {
          // 用户确认，执行选中
          const dateStates = { ...this.data.dateStates };
          dateStates[date] = targetLevel;
          this.setData({ dateStates });
          this.updateSummary();
        }
      }
    });
  },

  // 更新汇总信息（已表态且非冲突的才算"已选"）
  updateSummary() {
    const { weeks, dateStates } = this.data;
    let filledCount = 0;

    weeks.forEach(w => {
      const status = dateStates[w.date];
      if (status !== null && status > 0) filledCount++;
    });

    this.setData({ filledCount });
  },

  // 提交
  async submitAvailability() {
    const { voteId, dateStates, weeks } = this.data;

    if (this.data.filledCount < MIN_REQUIRED_DATES) {
      wx.showToast({ title: `请至少选择 ${MIN_REQUIRED_DATES} 个可用日期`, icon: 'none' });
      return;
    }

    const availability = {};
    const preferredSlots = [];
    const matrix = {};

    weeks.forEach(w => {
      const date = w.date;
      const status = dateStates[date];

      if (status === null || status === undefined) return;

      matrix[date] = status;

      if (status === 3) {
        preferredSlots.push(`${date}_全天`);
        availability[date] = ['全天'];
      } else if (status === 2 || status === 1) {
        availability[date] = ['全天'];
      }
      // status === 0 (冲突) 不加入 availability
    });

    this.setData({ submitting: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'submitAvailability',
        data: {
          voteId,
          availability,
          preferredSlots,
          matrix,
          flexibility: 2
        }
      });

      if (result.success) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/schedule-vote/result/result?voteId=${voteId}`
          });
        }, 500);
      } else {
        wx.showToast({ title: result.error || '提交失败', icon: 'none' });
      }
    } catch (err) {
      console.error('提交失败:', err);
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 查看结果
  viewResult() {
    wx.navigateTo({
      url: `/pages/schedule-vote/result/result?voteId=${this.data.voteId}`
    });
  }
});
