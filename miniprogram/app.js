const audioManager = require('./utils/audioManager');
const cloudConfig = require('./config/cloudConfig');

App({
  globalData: {},

  onLaunch: function () {
    // 初始化云开发
    if (wx.cloud) {
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
            this.showPrivacyModal();
          }
        },
        fail: () => {
        }
      });
    }
  },

  // 显示隐私协议弹窗
  showPrivacyModal() {
    const content = `感谢您使用【喵了个鱼】！

为了为您提供更好的服务，我们需要获取以下权限：

📍 位置信息
用于推荐您附近的餐厅、显示聚餐地点距离

👤 微信头像昵称
用于登录、显示您的个人资料和约饭记录

📷 相机权限
用于拍摄美食照片、扫码等功能

🖼️ 相册权限
用于上传美食照片到约饭活动

🔒 您的个人信息安全
我们承诺保护您的个人信息，不会将其泄露或用于其他用途。

请查阅《用户协议》和《隐私政策》了解更多详情。`;

    wx.showModal({
      title: '隐私保护指引',
      content: content,
      confirmText: '同意',
      cancelText: '拒绝',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('privacyAuthorized', true);
        } else {
          wx.setStorageSync('privacyAuthorized', false);
          wx.showToast({ 
            title: '部分功能可能受限', 
            icon: 'none', 
            duration: 3000 
          });
        }
      }
    });
  },

  // 初始化网络状态监听
  initNetworkListener() {
    wx.onNetworkStatusChange((res) => {
      if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开',
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showToast({
          title: '网络已恢复',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 获取当前网络类型
  getNetworkType() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve(res.networkType);
        },
        fail: () => {
          resolve('unknown');
        }
      });
    });
  },

  // 检查是否有网络连接
  hasNetwork() {
    return new Promise(async (resolve) => {
      const networkType = await this.getNetworkType();
      resolve(networkType !== 'none' && networkType !== 'unknown');
    });
  }
});
