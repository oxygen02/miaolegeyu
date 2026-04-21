App({
  onLaunch() {
    wx.cloud.init({ env: 'your-env-id', traceUser: false });
  },
  globalData: {
    systemInfo: wx.getSystemInfoSync()
  }
});
