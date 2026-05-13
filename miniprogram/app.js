const audioManager = require('./utils/audioManager');
const cloudConfig = require('./config/cloudConfig');
const { imagePaths } = require('./config/imageConfig');

App({
  globalData: {
    imagePaths: null, // 全局解析后的 imagePaths（cloud:// → https://）
    _imageReady: false,
  },

  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: cloudConfig.env,
        traceUser: true,
      });
      console.log('[App] 云开发初始化完成, 环境:', cloudConfig.env);
    }

    this._initAfterCloudReady();
    this.checkPrivacySetting();
    this.initNetworkListener();
    audioManager.init();
    this.checkUpdate();
  },

  _initAfterCloudReady() {
    setTimeout(() => { this.resolveGlobalImagePaths(); }, 500);
  },

  async resolveGlobalImagePaths() {
    // imageConfig.js 现在直接使用 HTTPS CDN URL，无需 getTempFileURL 转换
    // 直接将 imagePaths 设为全局数据即可
    this.globalData.imagePaths = imagePaths;
    this.globalData._imageReady = true;
    console.log('[App] ✅ 全局图片路径就绪（CDN 直链模式）');
  },

  getImagePaths() {
    return this.globalData.imagePaths || imagePaths;
  },

  /**
   * 等待图片路径解析完成，返回已解析的 imagePaths
   * 页面在 onLoad 中调用: const imagePaths = await getApp().whenImageReady();
   */
  whenImageReady() {
    return new Promise((resolve) => {
      if (this.globalData._imageReady && this.globalData.imagePaths) {
        resolve(this.globalData.imagePaths);
        return;
      }
      // 轮询等待，最多5秒
      let count = 0;
      const check = setInterval(() => {
        count++;
        if (this.globalData._imageReady && this.globalData.imagePaths) {
          clearInterval(check);
          resolve(this.globalData.imagePaths);
        } else if (count > 50) { // 5秒超时
          clearInterval(check);
          // 超时返回原始配置（CDN 直链，无需转换）
          console.warn('[App] whenImageReady 超时，返回原始 CDN 配置');
          resolve(imagePaths);
        }
      }, 100);
    });
  },

  getAudioManager() { return audioManager; },

  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({ title: '更新提示', content: '新版本已经准备好，是否重启应用？', success: function (res) { if (res.confirm) updateManager.applyUpdate(); } });
          });
          updateManager.onUpdateFailed(function () {
            wx.showModal({ title: '更新提示', content: '新版本下载失败，请检查网络后重试', showCancel: false });
          });
        }
      });
    }
  },

  checkPrivacySetting() {
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({ success: res => { if (res.needAuthorization) this.showPrivacyModal(); }, fail: () => {} });
    }
  },

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
    wx.showModal({ title: '隐私保护指引', content: content, confirmText: '同意', cancelText: '拒绝', success: (res) => {
      if (res.confirm) { wx.setStorageSync('privacyAuthorized', true); }
      else { wx.setStorageSync('privacyAuthorized', false); wx.showToast({ title: '部分功能可能受限', icon: 'none', duration: 3000 }); }
    }});
  },

  initNetworkListener() {
    wx.onNetworkStatusChange((res) => {
      wx.showToast({ title: res.isConnected ? '网络已恢复' : '网络已断开', icon: res.isConnected ? 'success' : 'none', duration: 2000 });
    });
  },

  getNetworkType() {
    return new Promise((resolve) => { wx.getNetworkType({ success: (res) => resolve(res.networkType), fail: () => resolve('unknown') }); });
  },

  hasNetwork() {
    return new Promise(async (resolve) => { const t = await this.getNetworkType(); resolve(t !== 'none' && t !== 'unknown'); });
  }
});
