const audioManager = require('./utils/audioManager');
const cloudConfig = require('./config/cloudConfig');

App({
  globalData: {},

  onLaunch: function () {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: cloudConfig.env,
        traceUser: true,
      })
    }

    // 检查隐私协议授权
    this.checkPrivacySetting();

    // 监听网络状态变化
    this.initNetworkListener();

    // 初始化音效
    audioManager.init();

    // 检查小程序更新
    this.checkUpdate();
  },

  // 检查小程序版本更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function (res) {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
          updateManager.onUpdateFailed(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本下载失败，请检查网络后重试',
              showCancel: false
            });
          });
        }
      });
    }
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
      confirmText: '同意并继续',
      cancelText: '暂不使用',
      success: (res) => {
        if (res.confirm) {
          // 用户同意
          wx.setStorageSync('privacyAuthorized', true);
          wx.showToast({ title: '感谢您的信任', icon: 'success' });
        } else {
          // 用户不同意，仅记录状态，不强制退出，允许游客模式使用
          wx.setStorageSync('privacyAuthorized', false);
          wx.showToast({ title: '已切换至游客模式', icon: 'none', duration: 2000 });
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
