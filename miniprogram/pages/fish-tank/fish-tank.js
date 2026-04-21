Page({
  data: {
    orders: [
      { id: 1, name: '张三', items: '奶茶x2', amount: 36, avatar: '/assets/images/juze_avatar.png' },
      { id: 2, name: '李四', items: '蛋糕x1', amount: 28, avatar: '/assets/images/juze_avatar.png' }
    ],
    total: 64,
    targetAmount: 100,
    progressPercent: 64,
    remaining: 36
  },
  onLoad(options) {
    console.log('鱼塘页面加载', options);
    this.calculateProgress();
  },
  onShow() {
    // 更新 tabBar 选中状态
    this.updateTabBarSelected();
  },
  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 1 });
    }
  },
  calculateProgress() {
    const { total, targetAmount } = this.data;
    const progressPercent = Math.min(Math.round((total / targetAmount) * 100), 100);
    const remaining = Math.max(targetAmount - total, 0);
    this.setData({ progressPercent, remaining });
  },
  joinOrder() {
    wx.showModal({
      title: '跟单',
      content: '功能开发中，敬请期待',
      showCancel: false
    });
  },
  shareOrder() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },
  onShareAppMessage() {
    return {
      title: '快来一起拼单',
      path: '/pages/fish-tank/fish-tank'
    };
  }
});
