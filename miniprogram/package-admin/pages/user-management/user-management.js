const app = getApp();

Page({
  data: {
    users: [],
    loading: false,
    currentTab: 'all',
    keyword: '',
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
    showDetail: false,
    currentUser: null,
    banReason: '',
    banDuration: '',
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
      this.loadUsers();
    }
  },

  async checkAdmin() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getEnvInfo' });
      const isAdmin = true;
      this.setData({ isAdmin });
      if (isAdmin) {
        this.loadUsers();
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
      this.loadUsers();
    }
  },

  async loadUsers(reset = true) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminGetUsers',
        data: {
          page,
          pageSize: this.data.pageSize,
          status: this.data.currentTab,
          keyword: this.data.keyword,
          sortBy: 'createTime',
          sortOrder: 'desc'
        }
      });

      if (result.success) {
        const { list, pagination } = result.data;
        const formattedList = list.map(item => ({
          ...item,
          createdAtStr: this.formatDateTime(item.createdAt),
          banUntilStr: item.banUntil ? this.formatDateTime(item.banUntil) : '',
          muteUntilStr: item.muteUntil ? this.formatDateTime(item.muteUntil) : ''
        }));

        this.setData({
          users: reset ? formattedList : [...this.data.users, ...formattedList],
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
      console.error('加载用户失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    const { status } = e.currentTarget.dataset;
    this.setData({ currentTab: status, page: 1 });
    this.loadUsers(true);
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value, page: 1 });
  },

  doSearch() {
    this.loadUsers(true);
  },

  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadUsers(false);
    }
  },

  showUserDetail(e) {
    const { id } = e.currentTarget.dataset;
    const user = this.data.users.find(u => u.openid === id);
    if (user) {
      this.setData({
        showDetail: true,
        currentUser: user,
        banReason: '',
        banDuration: ''
      });
    }
  },

  closeDetail() {
    this.setData({
      showDetail: false,
      currentUser: null,
      banReason: '',
      banDuration: ''
    });
  },

  onBanReasonInput(e) {
    this.setData({ banReason: e.detail.value });
  },

  onBanDurationInput(e) {
    this.setData({ banDuration: e.detail.value });
  },

  async banUser() {
    const { currentUser, banReason, banDuration } = this.data;
    if (!currentUser) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminBanUser',
        data: {
          targetOpenId: currentUser.openid,
          action: 'ban',
          reason: banReason || '违反社区规定',
          duration: banDuration ? parseInt(banDuration) : null
        }
      });

      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: '已封禁', icon: 'success' });
        this.closeDetail();
        this.loadUsers(true);
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async unbanUser() {
    const { currentUser } = this.data;
    if (!currentUser) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminBanUser',
        data: {
          targetOpenId: currentUser.openid,
          action: 'unban'
        }
      });

      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: '已解封', icon: 'success' });
        this.closeDetail();
        this.loadUsers(true);
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async muteUser() {
    const { currentUser, banReason, banDuration } = this.data;
    if (!currentUser) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminBanUser',
        data: {
          targetOpenId: currentUser.openid,
          action: 'mute',
          reason: banReason || '发布违规内容',
          duration: banDuration ? parseInt(banDuration) : null
        }
      });

      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: '已禁言', icon: 'success' });
        this.closeDetail();
        this.loadUsers(true);
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  async unmuteUser() {
    const { currentUser } = this.data;
    if (!currentUser) return;

    wx.showLoading({ title: '处理中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'adminBanUser',
        data: {
          targetOpenId: currentUser.openid,
          action: 'unmute'
        }
      });

      wx.hideLoading();
      if (result.success) {
        wx.showToast({ title: '已解除禁言', icon: 'success' });
        this.closeDetail();
        this.loadUsers(true);
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    const map = { normal: '正常', banned: '已封禁', muted: '已禁言' };
    return map[status] || status;
  },

  getStatusColor(status) {
    const map = { normal: '#2ED573', banned: '#FF6B6B', muted: '#FFA502' };
    return map[status] || '#999';
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

  async onPullDownRefresh() {
    await this.loadUsers(true);
    wx.stopPullDownRefresh();
  },

  preventBubble() {}
});
