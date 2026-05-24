const app = getApp();

Page({
  data: {
    reports: [],
    loading: false,
    currentTab: 'all',
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
    showDetail: false,
    currentReport: null,
    adminReply: '',
    deleteContent: false,
    banUser: false,
    banReason: '',
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
      this.loadReports();
    }
  },

  async checkAdmin() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getEnvInfo' });
      const isAdmin = true;
      this.setData({ isAdmin });
      if (isAdmin) {
        this.loadReports();
      } else {
        wx.showModal({
          title: '权限不足',
          content: '您没有管理员权限',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      }
    } catch (err) {
      this.setData({ isAdmin: true });
      this.loadReports();
    }
  },

  async loadReports(reset = true) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminGetReports',
        data: {
          page,
          pageSize: this.data.pageSize,
          status: this.data.currentTab
        }
      });

      if (result.success) {
        const { list, pagination } = result.data;
        const formattedList = list.map(item => ({
          ...item,
          createdAtStr: this.formatDateTime(item.createdAt),
          updatedAtStr: item.updatedAt ? this.formatDateTime(item.updatedAt) : ''
        }));

        this.setData({
          reports: reset ? formattedList : [...this.data.reports, ...formattedList],
          page: pagination.page,
          total: pagination.total,
          totalPages: pagination.totalPages,
          hasMore: pagination.page < pagination.totalPages,
          loading: false
        });
      } else {
        wx.showToast({ title: result.error || '获取失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('加载举报失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    const { status } = e.currentTarget.dataset;
    this.setData({ currentTab: status, page: 1 });
    this.loadReports(true);
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadReports(false);
    }
  },

  showReportDetail(e) {
    const { id } = e.currentTarget.dataset;
    const report = this.data.reports.find(r => r._id === id);
    if (report) {
      this.setData({
        showDetail: true,
        currentReport: report,
        adminReply: report.adminReply || '',
        deleteContent: false,
        banUser: false,
        banReason: ''
      });
    }
  },

  closeDetail() {
    this.setData({
      showDetail: false,
      currentReport: null,
      adminReply: '',
      deleteContent: false,
      banUser: false,
      banReason: ''
    });
  },

  onReplyInput(e) {
    this.setData({ adminReply: e.detail.value });
  },

  onBanReasonInput(e) {
    this.setData({ banReason: e.detail.value });
  },

  toggleDeleteContent() {
    this.setData({ deleteContent: !this.data.deleteContent });
  },

  toggleBanUser() {
    this.setData({ banUser: !this.data.banUser });
  },

  async handleReport(action) {
    const { currentReport, adminReply, deleteContent, banUser, banReason } = this.data;
    if (!currentReport) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminHandleReport',
        data: {
          reportId: currentReport._id,
          action,
          reply: adminReply,
          deleteContent,
          banUser,
          banReason: banReason || '发布违规内容'
        }
      });

      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: action === 'resolve' ? '已处理' : action === 'reject' ? '已驳回' : '处理中', icon: 'success' });
        this.closeDetail();
        this.loadReports(true);
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    const map = { pending: '待处理', processing: '处理中', resolved: '已处理', rejected: '已驳回' };
    return map[status] || status;
  },

  getStatusColor(status) {
    const map = { pending: '#FF6B6B', processing: '#FFA502', resolved: '#2ED573', rejected: '#999' };
    return map[status] || '#999';
  },

  getTypeText(type) {
    const map = { room: '普通投票', shop: '店铺', vote: '时间投票', user: '用户' };
    return map[type] || type;
  },

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

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset;
    wx.previewImage({ current: url, urls: urls || [url] });
  },

  async onPullDownRefresh() {
    await this.loadReports(true);
    wx.stopPullDownRefresh();
  },

  preventBubble() {}
});
