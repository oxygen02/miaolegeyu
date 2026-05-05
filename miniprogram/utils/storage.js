/**
 * 本地存储统一管理
 * 避免存储键名分散、难以维护的问题
 */

const KEYS = {
  USER_INFO: 'userInfo',
  PRIVACY_AUTHORIZED: 'privacyAuthorized',
  SETTINGS: 'app_settings',
  RECENT_ROOMS: 'recent_rooms',
  SEARCH_HISTORY: 'search_history'
};

const storage = {
  // ============ 用户信息 ============
  getUserInfo() {
    try {
      return wx.getStorageSync(KEYS.USER_INFO) || null;
    } catch (e) {
      console.error('读取用户信息失败:', e);
      return null;
    }
  },
  
  setUserInfo(userInfo) {
    try {
      wx.setStorageSync(KEYS.USER_INFO, userInfo);
      return true;
    } catch (e) {
      console.error('保存用户信息失败:', e);
      return false;
    }
  },
  
  clearUserInfo() {
    try {
      wx.removeStorageSync(KEYS.USER_INFO);
      return true;
    } catch (e) {
      console.error('清除用户信息失败:', e);
      return false;
    }
  },
  
  // ============ 隐私协议 ============
  getPrivacyAuthorized() {
    try {
      return wx.getStorageSync(KEYS.PRIVACY_AUTHORIZED) || false;
    } catch (e) {
      return false;
    }
  },
  
  setPrivacyAuthorized(val) {
    try {
      wx.setStorageSync(KEYS.PRIVACY_AUTHORIZED, val);
    } catch (e) {
      console.error('保存隐私协议状态失败:', e);
    }
  },
  
  // ============ 通用方法 ============
  get(key) {
    try {
      return wx.getStorageSync(key) || null;
    } catch (e) {
      return null;
    }
  },
  
  set(key, value) {
    try {
      wx.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.error('存储失败:', e);
      return false;
    }
  },
  
  remove(key) {
    try {
      wx.removeStorageSync(key);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  clear() {
    try {
      wx.clearStorageSync();
      return true;
    } catch (e) {
      return false;
    }
  }
};

module.exports = {
  KEYS,
  ...storage
};
