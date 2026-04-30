const audioManager = require('./utils/audioManager');

App({
  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d5ggnf5wh2d872f3c',
        traceUser: true,
      })
    }

    // 检查隐私协议授权
    this.checkPrivacySetting();

    // 监听网络状态变化
    this.initNetworkListener();

    // 初始化音效
    audioManager.init();
  },

  // 获取音效管理器
  getAudioManager() {
    return audioManager;
  },

  // 检查隐私协议设置
  checkPrivacySetting() {
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: res => {
          if (res.needAuthorization) {
            // 需要展示隐私协议弹窗
            this.showPrivacyModal();
          }
        },
        fail: () => {
          console.log('隐私设置检查失败');
        }
      });
    }
  },

  // 显示隐私协议弹窗
  showPrivacyModal() {
    wx.showModal({
      title: '隐私保护指引',
      content: '在使用本小程序之前，请您仔细阅读并同意《用户协议》和《隐私政策》。我们将保护您的个人信息安全。',
      confirmText: '同意',
      cancelText: '不同意',
      success: (res) => {
        if (res.confirm) {
          // 用户同意
          wx.setStorageSync('privacyAuthorized', true);
        } else {
          // 用户不同意，退出小程序
          wx.showToast({
            title: '需要同意隐私协议才能使用',
            icon: 'none',
            duration: 2000
          });
          setTimeout(() => {
            wx.exitMiniProgram();
          }, 2000);
        }
      }
    });
  },

  // 初始化网络状态监听
  initNetworkListener() {
    // 获取当前网络状态
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        if (networkType === 'none') {
          this.showNetworkError();
        }
      }
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        this.showNetworkError();
      } else {
        // 网络恢复
        wx.showToast({
          title: '网络已恢复',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 显示网络错误提示
  showNetworkError() {
    wx.showModal({
      title: '网络异常',
      content: '当前网络不可用，请检查网络设置后重试。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 全局错误处理
  onError(msg) {
    console.error('小程序错误:', msg);
  },

  // 全局未捕获Promise错误处理
  onUnhandledRejection(res) {
    console.error('未处理的Promise错误:', res);
  }
})
