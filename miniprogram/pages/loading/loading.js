Page({
  onLoad() {
    // 快速跳转首页
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 100);
  }
});
