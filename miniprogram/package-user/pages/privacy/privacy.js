const app = getApp();

Page({
  data: {
    imagePaths: {},
    currentTab: 'privacy',
    tabs: [
      { id: 'privacy', label: '隐私政策' },
      { id: 'agreement', label: '用户协议' }
    ],
    scrollTop: 0
  },

  async onLoad(options) {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    
    // 根据 URL 参数设置默认标签页
    if (options && options.tab) {
      this.setData({ currentTab: options.tab });
    }
  },

  onTabChange(e) {
    const tabId = e.currentTarget.dataset.tabId;
    this.setData({ currentTab: tabId, scrollTop: 0 });
  },

  onBack() {
    wx.navigateBack();
  },

  onShareAppMessage() {
    return {
      title: '喵了个鱼 - 聚会拼单投票小程序',
      path: '/pages/index/index'
    };
  }
});