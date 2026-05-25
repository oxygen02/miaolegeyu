const audioManager = require('./utils/audioManager');
const cloudConfig = require('./config/cloudConfig');
const { imagePaths, CDN_BASE } = require('./config/imageConfig');
const auth = require('./utils/auth');
const Validator = require('./utils/validator');
const debounce = require('./utils/debounce');
const uuid = require('./utils/uuid');
const cuisineCategories = require('./data/cuisineCategories');
const holidayConfig = require('./config/holidayConfig');
const poster = require('./utils/poster');
const tracker = require('./utils/tracker');

App({
  globalData: {
    imagePaths: imagePaths, // 直接赋值，避免页面获取时为 null
    _imageReady: true,
    // 公共模块挂载，供分包通过 getApp().globalData.xxx 访问
    audioManager,
    auth,
    Validator,
    debounce,
    uuid,
    cuisineCategories,
    holidayConfig,
    CDN_BASE,
    poster,
    tracker,
  },

  onLaunch: function () {
    if (wx.cloud) {
      wx.cloud.init({
        env: cloudConfig.env,
        traceUser: true,
      });
    }

    this._initAfterCloudReady();
    this.checkPrivacySetting();
    this.initNetworkListener();
    audioManager.init();
    tracker.initPerformanceMonitor();
    // checkUpdate 可能触发网络请求，延迟执行避免阻塞
    setTimeout(() => this.checkUpdate(), 2000);
  },

  _initAfterCloudReady() {
    setTimeout(() => { this.resolveGlobalImagePaths(); }, 500);
  },

  async resolveGlobalImagePaths() {
    // imageConfig.js 现在直接使用 HTTPS CDN URL，无需 getTempFileURL 转换
    // 直接将 imagePaths 设为全局数据即可
    this.globalData.imagePaths = imagePaths;
    this.globalData._imageReady = true;
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
    // 隐私协议已显示过，不再重复显示
    if (wx.getStorageSync('privacyPromptShown')) {
      return;
    }
    
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({ 
        success: res => { 
          if (res.needAuthorization) {
            this.showPrivacyModal(); 
          } else {
            // 不需要授权时，标记为已处理
            wx.setStorageSync('privacyPromptShown', true);
          }
        }, 
        fail: () => {
          // 获取设置失败时，标记为已处理避免重复尝试
          wx.setStorageSync('privacyPromptShown', true);
        } 
      });
    } else {
      // 基础库不支持时，标记为已处理
      wx.setStorageSync('privacyPromptShown', true);
    }
  },

  showPrivacyModal() {
    wx.setStorageSync('privacyPromptShown', true);
    
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

您可以在【我的】→【设置】中查看完整的《用户协议》和《隐私政策》。`;
    
    wx.showModal({ 
      title: '隐私保护指引', 
      content: content, 
      confirmText: '同意',
      cancelText: '暂不授权',
      success: (res) => {
        if (res.confirm) { 
          wx.setStorageSync('privacyAuthorized', true);
          wx.showToast({ 
            title: '已授权，可正常使用', 
            icon: 'success',
            duration: 2000
          });
        }
        else { 
          wx.setStorageSync('privacyAuthorized', false); 
          wx.showModal({
            title: '提示',
            content: '您已拒绝授权，部分功能可能无法使用。\n\n您可以在【设置】中重新授权后使用完整功能。',
            showCancel: true,
            confirmText: '知道了',
            cancelText: '查看设置',
            success: (modalRes) => {
              if (!modalRes.confirm && modalRes.cancel) {
                // 用户选择查看设置，跳转到设置页面
                wx.openSetting({
                  success: (setRes) => {
                    console.log('用户打开设置页:', setRes);
                  }
                });
              }
            }
          });
        }
      }
    });
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
