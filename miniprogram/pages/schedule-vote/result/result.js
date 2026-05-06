const { imagePaths } = require('../../../config/imageConfig');
const { HOLIDAY_CONFIG } = require('../../../config/holidayConfig');

// ======== Mock 数据（调试用）========
const MOCK_VOTE = {
  _id: 'mock-vote-001',
  title: '本周聚餐时间投票',
  candidateDates: ['2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12'],
  timePeriod: 'dinner',
  isExpired: false,
  isCreator: true, // 当前用户是发起人
  creatorName: '喵喵队长',
  creatorAvatar: ''
};

const MOCK_PARTICIPANTS = [
  {
    openId: 'user-001',
    name: '喵喵队长',
    avatar: '',
    matrix: {
      '2026-05-08': 3, '2026-05-09': 3, '2026-05-10': 2,
      '2026-05-11': 2, '2026-05-12': 0
    },
    submitTime: '2026-05-06 10:23'
  },
  {
    openId: 'user-002',
    name: '奶茶喵',
    avatar: '',
    matrix: {
      '2026-05-08': 2, '2026-05-09': 3, '2026-05-10': 3,
      '2026-05-11': 1, '2026-05-12': 0
    },
    submitTime: '2026-05-06 11:05'
  },
  {
    openId: 'user-003',
    name: '咖喱喵',
    avatar: '',
    matrix: {
      '2026-05-08': 1, '2026-05-09': 2, '2026-05-10': 2,
      '2026-05-11': 3, '2026-05-12': 1
    },
    submitTime: '2026-05-06 14:30'
  },
  {
    openId: 'user-004',
    name: '布丁喵',
    avatar: '',
    matrix: {
      '2026-05-08': 0, '2026-05-09': 2, '2026-05-10': 3,
      '2026-05-11': 2, '2026-05-12': 3
    },
    submitTime: '2026-05-06 16:42'
  },
  {
    openId: 'user-005',
    name: '芒果喵',
    avatar: '',
    matrix: {
      '2026-05-08': 3, '2026-05-09': 0, '2026-05-10': 1,
      '2026-05-11': 0, '2026-05-12': 2
    },
    submitTime: '2026-05-06 18:00'
  }
];
// ======== Mock 数据结束 ========

const LEVEL_CONFIG = {
  0: { label: '冲突', class: 'level-conflict' },
  1: { label: '不定', class: 'level-uncertain' },
  2: { label: '可以', class: 'level-ok' },
  3: { label: '首选', class: 'level-best' }
};

Page({
  data: {
    imagePaths,
    voteId: '',
    loading: true,
    refreshing: false,
    vote: null,
    // 成员列表
    participants: [],
    // 日期列表
    weeks: [],
    // 汇总统计
    summary: {},
    // 推荐日期
    recommendations: [],
    // 当前视图：'summary' | 'detail'
    viewMode: 'summary',
    // 展开的成员
    expandedParticipant: null,
    // 级别配置
    LEVEL_CONFIG
  },

  onLoad(options) {
    const { voteId } = options;
    this.setData({ voteId });
    if (voteId) {
      this.loadResult(voteId);
    } else {
      // 没有 voteId 时使用 Mock 数据调试
      this.loadMockData();
    }
  },

  // 加载 Mock 数据（调试用）
  loadMockData() {
    const vote = MOCK_VOTE;
    const weeks = this.generateWeeks(vote.candidateDates);
    const participants = this.processParticipants(MOCK_PARTICIPANTS, vote.candidateDates);
    const summary = this.calcSummary(participants, vote.candidateDates);
    const recommendations = this.calcRecommendations(summary, vote.candidateDates);

    this.setData({
      vote,
      weeks,
      participants,
      summary,
      recommendations,
      loading: false
    });
  },

  onShow() {
    if (this.data.voteId) {
      this.loadResult(this.data.voteId);
    }
  },

  // 加载结果
  async loadResult(voteId) {
    if (!this.data.refreshing) {
      this.setData({ loading: true });
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getScheduleVote',
        data: { voteId }
      });

      if (result.success) {
        const vote = result.vote;
        const weeks = this.generateWeeks(vote.candidateDates);
        const participants = this.processParticipants(vote.participants || [], vote.candidateDates);
        const summary = this.calcSummary(participants, vote.candidateDates);
        const recommendations = this.calcRecommendations(summary, vote.candidateDates);

        this.setData({
          vote,
          weeks,
          participants,
          summary,
          recommendations
        });
      } else {
        wx.showToast({ title: result.error || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  // 生成日期数据
  generateWeeks(dates) {
    return dates.map(dateStr => {
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
        dateTag
      };
    });
  },

  // 处理参与者数据
  processParticipants(participants, candidateDates) {
    return participants.map(p => {
      const matrix = {};
      candidateDates.forEach(date => {
        if (p.matrix && p.matrix[date] !== undefined) {
          matrix[date] = Number(p.matrix[date]);
        } else {
          // 旧格式兼容
          const hasAvail = p.availability && p.availability[date] && p.availability[date].length > 0;
          const hasPreferred = p.preferredSlots && p.preferredSlots.some(key => key.startsWith(date + '_'));
          if (hasPreferred) matrix[date] = 3;
          else if (hasAvail) matrix[date] = 2;
          else matrix[date] = 0;
        }
      });

      let preferredCount = 0, okCount = 0;
      candidateDates.forEach(date => {
        if (matrix[date] === 3) preferredCount++;
        else if (matrix[date] === 2) okCount++;
      });

      return {
        openId: p.openId,
        name: p.name || '神秘喵友',
        avatar: p.avatar || '',
        matrix,
        preferredCount,
        okCount,
        submitTime: p.submitTime
      };
    });
  },

  // 计算汇总统计
  calcSummary(participants, dates) {
    const summary = {};
    dates.forEach(date => {
      summary[date] = { preferred: 0, ok: 0, uncertain: 0, conflict: 0, total: participants.length };
      participants.forEach(p => {
        const level = p.matrix[date];
        if (level === 3) summary[date].preferred++;
        else if (level === 2) summary[date].ok++;
        else if (level === 1) summary[date].uncertain++;
        else summary[date].conflict++;
      });
    });
    return summary;
  },

  // 计算推荐日期
  calcRecommendations(summary, dates) {
    const scored = dates.map(date => {
      const s = summary[date];
      // 算法：首选3分 + 可以2分 + 不定1分，除以总人数
      const score = ((s.preferred * 3) + (s.ok * 2) + (s.uncertain * 1)) / Math.max(s.total, 1);
      const okRate = (s.preferred + s.ok + s.uncertain) / Math.max(s.total, 1);
      return { date, score, okRate, ...s };
    });

    return scored
      .filter(s => s.okRate > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  },

  // 切换视图
  switchView(e) {
    const { mode } = e.currentTarget.dataset;
    this.setData({ viewMode: mode });
  },

  // 展开/收起成员详情
  toggleParticipant(e) {
    const { index } = e.currentTarget.dataset;
    const current = this.data.expandedParticipant;
    this.setData({
      expandedParticipant: current === index ? null : index
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    this.setData({ refreshing: true });
    await this.loadResult(this.data.voteId);
    wx.stopPullDownRefresh();
  },

  // 去填写
  goFill() {
    wx.navigateTo({
      url: `/pages/schedule-vote/fill/fill?voteId=${this.data.voteId}&title=${encodeURIComponent(this.data.vote?.title || '')}`
    });
  },

  // 发起人确认时间
  async confirmDate(e) {
    const { date } = e.currentTarget.dataset;
    const { vote, voteId } = this.data;

    if (!vote.isCreator) {
      wx.showToast({ title: '仅发起人可确认', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认时间',
      content: `确定选择 ${date} ${vote.timePeriod === 'lunch' ? '中午' : '晚上'} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '处理中...' });
          try {
            await wx.cloud.callFunction({
              name: 'closeScheduleVote',
              data: { voteId, confirmedDate: date }
            });
            wx.hideLoading();

            // 询问是否创建聚餐
            wx.showModal({
              title: '时间已确认',
              content: `已确认 ${date} ${vote.timePeriod === 'lunch' ? '中午' : '晚上'}，是否立即创建聚餐活动？`,
              confirmText: '创建聚餐',
              cancelText: '仅关闭',
              success: (createRes) => {
                if (createRes.confirm) {
                  // 跳转到聚餐创建页（模式A），预填时间信息
                  const params = [
                    `fromScheduleVote=true`,
                    `scheduleDate=${encodeURIComponent(date)}`,
                    `schedulePeriod=${encodeURIComponent(vote.timePeriod || 'dinner')}`,
                    `voteTitle=${encodeURIComponent(vote.title || '')}`
                  ].join('&');
                  wx.navigateTo({
                    url: `/pages/create-mode-a/create-mode-a?${params}`
                  });
                } else {
                  wx.showToast({ title: '已确认', icon: 'success' });
                }
              }
            });
          } catch (err) {
            wx.hideLoading();
            console.error('确认失败:', err);
            wx.showToast({ title: '确认失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 查看我的时间投票列表
  goMyScheduleVotes() {
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  // 分享
  onShareAppMessage() {
    const { vote, voteId } = this.data;
    return {
      title: `📅 ${vote?.title || '时间投票'}`,
      path: `/pages/schedule-vote/fill/fill?voteId=${voteId}&title=${encodeURIComponent(vote?.title || '')}`,
      imageUrl: imagePaths.banners.faqijucan
    };
  }
});
