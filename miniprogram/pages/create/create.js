const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

// 发起者选择页
Page({
  data: {
    imagePaths: imagePaths
  },

  onLoad() {
    // 页面加载
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 模式A：我选好了
  goModeA() {
    audioManager.playMeowShort();
    wx.navigateTo({
      url: '/pages/create-mode-a/create-mode-a'
    });
  },

  // 模式B：你们来定
  goModeB() {
    audioManager.playMeowShort();
    wx.navigateTo({
      url: '/pages/create-mode-b/create-mode-b'
    });
  },

  // 拼单
  goGroup() {
    audioManager.playMeowShort();
    wx.navigateTo({
      url: '/pages/create-group-order/create-group-order'
    });
  }
});
