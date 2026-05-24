/**
 * 管理员后台 - 反馈管理
 * 功能：查看用户反馈列表、筛选、更新状态、回复
 */
const app = getApp();

Page({
  data: {
    feedbacks: [],
    loading: false,
    currentTab: 'all',      // all, pending, processing, resolved
    currentType: 'all',     // all, bug, feature, ui, performance, other
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
    stats: {
      status: [],
      type: []
    },
    pendingCount: 0,
    processingCount: 0,
    resolvedCount: 0,
    showDetail: false,
    currentFeedback: null,
    replyContent: '',
    isAdmin: false,
    imagePaths: {}
  },

  async onLoad() {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    this.checkAdmin();
  },

  onShow() {
    if (this.data.isAdmin) {
      this.loadFeedbacks();
    }
  },

  // 检查管理员权限
  async checkAdmin() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getEnvInfo'
      });

      // 简单判断：通过云函数返回的环境信息，或者本地存储的管理员标识
      // 实际项目中应该通过云函数验证管理员身份
      const adminIds = result?.data?.adminIds || [];
      const userInfo = app.globalData.auth?.getUserInfo();

      // 这里使用一个简单的方式：如果用户ID在管理员列表中，或者是特定用户
      // 实际项目中应该通过云函数验证
      const isAdmin = true; // 开发阶段先开放，上线后改为真实验证

      this.setData({ isAdmin });

      if (isAdmin) {
        this.loadFeedbacks();
      } else {
        wx.showModal({
          title: '权限不足',
          content: '您没有管理员权限',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      }
    } catch (err) {
      console.error('检查权限失败:', err);
      // 开发阶段允许访问
      this.setData({ isAdmin: true });
      this.loadFeedbacks();
    }
  },

  // 加载反馈列表
  async loadFeedbacks(reset = true) {
    if (this.data.loading) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getFeedbacks',
        data: {
          status: this.data.currentTab,
          type: this.data.currentType,
          page,
          pageSize: this.data.pageSize,
          sortBy: 'createTime',
          sortOrder: 'desc'
        }
      });

      if (result.success) {
        const { list, pagination, stats } = result.data;

        // 格式化时间
        const formattedList = list.map(item => ({
          ...item,
          createTimeStr: this.formatDateTime(item.createTime),
          updateTimeStr: item.updateTime ? this.formatDateTime(item.updateTime) : ''
        }));

        // 从 stats 中提取各状态数量
        const statusList = stats.status || [];
        const pendingCount = statusList.find(s => s._id === 'pending')?.count || 0;
        const processingCount = statusList.find(s => s._id === 'processing')?.count || 0;
        const resolvedCount = statusList.find(s => s._id === 'resolved')?.count || 0;

        this.setData({
          feedbacks: reset ? formattedList : [...this.data.feedbacks, ...formattedList],
          page: pagination.page,
          total: pagination.total,
          totalPages: pagination.totalPages,
          hasMore: pagination.page < pagination.totalPages,
          stats,
          pendingCount,
          processingCount,
          resolvedCount,
          loading: false
        });
      } else {
        wx.showToast({ title: result.msg || '获取失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载反馈失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 切换状态标签
  switchTab(e) {
    const { status } = e.currentTarget.dataset;
    this.setData({ currentTab: status, page: 1 });
    this.loadFeedbacks(true);
  },

  // 切换类型筛选
  switchType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ currentType: type, page: 1 });
    this.loadFeedbacks(true);
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadFeedbacks(false);
    }
  },

  // 查看详情
  showDetail(e) {
    const { id } = e.currentTarget.dataset;
    const feedback = this.data.feedbacks.find(f => f._id === id);
    if (feedback) {
      this.setData({
        showDetail: true,
        currentFeedback: feedback,
        replyContent: feedback.reply || ''
      });
    }
  },

  // 关闭详情
  closeDetail() {
    this.setData({
      showDetail: false,
      currentFeedback: null,
      replyContent: ''
    });
  },

  // 输入回复
  onReplyInput(e) {
    this.setData({ replyContent: e.detail.value });
  },

  // 更新状态
  async updateStatus(e) {
    const { status } = e.currentTarget.dataset;
    const { currentFeedback, replyContent } = this.data;

    if (!currentFeedback) return;

    wx.showLoading({ title: '更新中...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateFeedback',
        data: {
          feedbackId: currentFeedback._id,
          status,
          reply: replyContent || undefined
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '更新成功', icon: 'success' });

        // 更新本地数据
        const updatedFeedbacks = this.data.feedbacks.map(f => {
          if (f._id === currentFeedback._id) {
            return {
              ...f,
              status,
              reply: replyContent || f.reply
            };
          }
          return f;
        });

        this.setData({
          feedbacks: updatedFeedbacks,
          showDetail: false,
          currentFeedback: null,
          replyContent: ''
        });

        // 刷新列表和统计
        this.loadFeedbacks(true);
      } else {
        wx.showToast({ title: result.msg || '更新失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  // 提交回复
  async submitReply() {
    const { currentFeedback, replyContent } = this.data;

    if (!replyContent.trim()) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发送中...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateFeedback',
        data: {
          feedbackId: currentFeedback._id,
          reply: replyContent.trim()
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '回复成功', icon: 'success' });

        // 更新本地数据
        const updatedFeedbacks = this.data.feedbacks.map(f => {
          if (f._id === currentFeedback._id) {
            return { ...f, reply: replyContent.trim() };
          }
          return f;
        });

        this.setData({
          feedbacks: updatedFeedbacks,
          showDetail: false,
          currentFeedback: null,
          replyContent: ''
        });

        this.loadFeedbacks(true);
      } else {
        wx.showToast({ title: result.msg || '回复失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '回复失败', icon: 'none' });
    }
  },

  // 复制内容
  copyContent(e) {
    const { content } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: urls || [url]
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
      pending: '待处理',
      processing: '处理中',
      resolved: '已解决'
    };
    return map[status] || status;
  },

  // 获取类型文本
  getTypeText(type) {
    const map = {
      bug: 'Bug反馈',
      feature: '功能建议',
      ui: 'UI问题',
      performance: '性能问题',
      other: '其他'
    };
    return map[type] || type;
  },

  // 获取状态颜色
  getStatusColor(status) {
    const map = {
      pending: '#FF6B6B',
      processing: '#FFA502',
      resolved: '#2ED573'
    };
    return map[status] || '#999';
  },

  // 获取类型图标
  getTypeIcon(type) {
    const map = {
      bug: '🐛',
      feature: '✨',
      ui: '🎨',
      performance: '⚡',
      other: '📝'
    };
    return map[type] || '📝';
  },

  // 格式化时间
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');

    return `${month}-${day} ${hour}:${minute}`;
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadFeedbacks(true);
    wx.stopPullDownRefresh();
  },

  // 跳转到用户管理
  goToUserManagement() {
    wx.navigateTo({
      url: '/package-admin/pages/user-management/user-management'
    });
  },

  // 跳转到内容管理
  goToContentManagement() {
    wx.navigateTo({
      url: '/package-admin/pages/content-management/content-management'
    });
  },

  // 跳转到举报管理
  goToReportManagement() {
    wx.navigateTo({
      url: '/package-admin/pages/report-management/report-management'
    });
  },

  // 阻止冒泡
  preventBubble() {}
});