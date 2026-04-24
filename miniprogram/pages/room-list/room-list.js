Page({
  data: {
    creatorGroups: [],
    currentFilter: 'all',
    loading: true,
    cardColors: ['orange', 'green', 'blue', 'purple', 'pink']
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'getRoomsByCreator',
        data: { status: this.data.currentFilter === 'all' ? '' : this.data.currentFilter }
      });
      
      if (res.result.code !== 0) {
        throw new Error(res.result.msg);
      }
      
      // 为每个发起人添加展开状态
      const creatorGroups = (res.result.data || []).map(group => ({
        ...group,
        expanded: false
      }));
      
      this.setData({
        creatorGroups,
        loading: false
      });
      
    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.loadData();
  },

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    const creatorGroups = this.data.creatorGroups;
    creatorGroups[index].expanded = !creatorGroups[index].expanded;
    this.setData({ creatorGroups });
  },

  goToRoom(e) {
    const { roomid } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/vote/vote?roomId=${roomid}`
    });
  }
});
