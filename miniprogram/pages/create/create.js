// 发起者选择页
Page({
  data: {
    // 页面数据
  },

  onLoad() {
    // 页面加载
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 模式A：我挑好了
  goModeA() {
    wx.navigateTo({
      url: '/pages/create-mode-a/create-mode-a'
    });
  },

  // 模式B：你们来定
  goModeB() {
    wx.navigateTo({
      url: '/pages/create-mode-b/create-mode-b'
    });
  },

  // 拼单
  goGroup() {
    wx.navigateTo({
      url: '/pages/create-group-order/create-group-order'
    });
  }
});
