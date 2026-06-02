const { imagePaths } = getApp().globalData;
const app = getApp();

Page({
  data: {
    imagePaths: {},
    version: '1.0.0',
    appName: '喵了个鱼',
    description: '熟人聚会决策助手',
    features: [
      {
        icon: imagePaths.icons.toupiaojuece,
        title: '聚会决策',
        desc: '快速创建聚会活动，邀请好友投票参与'
      },
      {
        icon: imagePaths.icons.tuijian,
        title: '店铺推荐',
        desc: '发现优质店铺，分享美食体验'
      },
      {
        icon: imagePaths.icons.hudong,
        title: '好友互动',
        desc: '邀请好友一起决策，让聚会更有趣'
      },
      {
        icon: imagePaths.icons.gexingtouxiang,
        title: '个性头像',
        desc: '丰富的头像选择，展现独特个性'
      }
    ],
    contact: {
      email: 'oygq15510183555@163.com',
      wechat: 'oygq15510183555'
    }
  },

  async onLoad() {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    // 获取小程序版本信息
    const accountInfo = wx.getAccountInfoSync();
    if (accountInfo && accountInfo.miniProgram) {
      this.setData({
        version: accountInfo.miniProgram.version || '1.0.0'
      });
    }
  },

  // 复制邮箱
  copyEmail() {
    wx.setClipboardData({
      data: this.data.contact.email,
      success: () => {
        wx.showToast({
          title: '邮箱已复制',
          icon: 'success'
        });
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  }
});
