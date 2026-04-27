Page({
  data: {
    historyList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20
  },

  onLoad() {
    this.loadHistory();
  },

  // 加载历史记录
  async loadHistory(reset = false) {
    if (this.data.loading) return;

    const page = reset ? 1 : this.data.page;

    this.setData({ loading: true });

    try {
      // 这里可以调用云函数获取历史记录
      // 暂时使用本地存储模拟
      const history = wx.getStorageSync('activityHistory') || [];

      // 分页处理
      const start = (page - 1) * this.data.pageSize;
      const end = start + this.data.pageSize;
      const pageData = history.slice(start, end);

      this.setData({
        historyList: reset ? pageData : [...this.data.historyList, ...pageData],
        hasMore: pageData.length === this.data.pageSize,
        page: page + 1,
        loading: false
      });
    } catch (err) {
      console.error('加载历史记录失败:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadHistory();
    }
  },

  // 查看详情
  viewDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    if (type === 'room') {
      wx.navigateTo({ url: `/pages/control/control?roomId=${id}` });
    } else if (type === 'shop') {
      wx.navigateTo({ url: `/pages/shop-detail/shop-detail?id=${id}` });
    }
  },

  // 清空历史
  clearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确定要清空所有历史记录吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('activityHistory');
          this.setData({
            historyList: [],
            hasMore: false
          });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // 返回
  goBack() {
    wx.navigateBack();
  }
});
