/**
 * 登录相关工具函数
 * 集中管理登录逻辑，避免各页面重复编写
 * 包含：微信登录、快速体验登录、自定义登录、退出登录
 */

const RANDOM_NAMES = ['橘喵', '胖橘', '三花', '狸花', '布偶', '英短', '美短', '暹罗', '缅因', '波斯', '金渐层', '银渐层', '蓝猫', '黑猫', '白猫'];

/**
 * 获取本地缓存的用户信息
 */
function getUserInfo() {
  try {
    return wx.getStorageSync('userInfo') || null;
  } catch (e) {
    return null;
  }
}

/**
 * 保存用户信息到本地缓存
 */
function setUserInfo(userInfo) {
  try {
    wx.setStorageSync('userInfo', userInfo);
  } catch (e) {
    console.error('保存用户信息失败:', e);
  }
}

/**
 * 检查登录状态
 * @returns {boolean}
 */
function isLoggedIn() {
  const info = getUserInfo();
  return !!(info && info.isLogin);
}

/**
 * 退出登录
 * @param {function} callback - 退出后的回调
 */
function logout(callback) {
  wx.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmColor: '#FF6B6B',
    success: (res) => {
      if (res.confirm) {
        wx.removeStorageSync('userInfo');
        wx.showToast({ title: '已退出登录', icon: 'success' });
        if (typeof callback === 'function') {
          callback();
        }
      }
    }
  });
}

/**
 * 快速体验登录（随机昵称）
 * @param {function} callback - 登录成功后的回调，参数为 userInfo
 */
function quickLogin(callback) {
  wx.showLoading({ title: '登录中...' });
  const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const userInfo = {
    nickName: randomName + Math.floor(Math.random() * 10000),
    avatarUrl: '',
    userId: 'user_' + Date.now(),
    isLogin: true
  };
  setUserInfo(userInfo);
  wx.hideLoading();
  wx.showToast({ title: '登录成功', icon: 'success' });
  if (typeof callback === 'function') {
    callback(userInfo);
  }
  return userInfo;
}

/**
 * 微信一键登录
 * @param {function} callback - 登录成功后的回调，参数为 userInfo
 */
function wechatLogin(callback) {
  wx.getUserProfile({
    desc: '用于完善用户资料',
    success: (profileRes) => {
      wx.showLoading({ title: '登录中...' });
      const userInfo = {
        nickName: profileRes.userInfo.nickName,
        avatarUrl: profileRes.userInfo.avatarUrl,
        userId: 'user_' + Date.now(),
        isLogin: true
      };
      setUserInfo(userInfo);
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      if (typeof callback === 'function') {
        callback(userInfo);
      }
      return userInfo;
    },
    fail: () => {
      wx.showToast({ title: '已取消', icon: 'none' });
    }
  });
}

/**
 * 自定义登录（跳转到头像选择页）
 */
function customLogin() {
  wx.navigateTo({
    url: '/pages/avatar-select/avatar-select?mode=login'
  });
}

/**
 * 显示登录选项弹窗
 * @param {function} onLoginSuccess - 登录成功后的回调
 */
function showLoginOptions(onLoginSuccess) {
  wx.showActionSheet({
    itemList: ['微信一键登录', '快速体验（随机昵称）', '自定义昵称和头像'],
    success: (res) => {
      if (res.tapIndex === 0) {
        wechatLogin(onLoginSuccess);
      } else if (res.tapIndex === 1) {
        quickLogin(onLoginSuccess);
      } else if (res.tapIndex === 2) {
        customLogin();
      }
    }
  });
}

/**
 * 刷新页面用户信息（从storage重新读取并更新data）
 * 用于在 onShow 中调用
 * @param {object} page - 页面实例 (this)
 */
function refreshUserInfo(page) {
  const userInfo = getUserInfo();
  if (userInfo) {
    page.setData({ userInfo });
  } else {
    page.setData({
      userInfo: {
        nickName: '',
        avatarUrl: '',
        userId: '',
        isLogin: false
      }
    });
  }
}

module.exports = {
  getUserInfo,
  setUserInfo,
  isLoggedIn,
  logout,
  quickLogin,
  wechatLogin,
  customLogin,
  showLoginOptions,
  refreshUserInfo
};
