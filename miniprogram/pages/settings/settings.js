const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

Page({
  data: {
    imagePaths: imagePaths,
    userInfo: {
      nickName: '',
      avatarUrl: '',
      userId: '',
      isLogin: false
    },
    settings: {
      notification: true,
      sound: true,
      autoUpdate: true
    }
  },

  onLoad() {
    this.loadUserInfo();
    this.loadSettings();
  },

  onShow() {
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
  },

  // 加载设置
  loadSettings() {
    const settings = wx.getStorageSync('appSettings');
    const audioSettings = audioManager.getSettings();
    if (settings) {
      this.setData({
        settings: {
          ...settings,
          sound: audioSettings.enabled
        }
      });
    } else {
      this.setData({
        'settings.sound': audioSettings.enabled
      });
    }
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('appSettings', this.data.settings);
  },

  // 切换通知设置
  toggleNotification(e) {
    this.setData({
      'settings.notification': e.detail.value
    });
    this.saveSettings();
  },

  // 切换声音设置
  toggleSound(e) {
    const enabled = e.detail.value;
    this.setData({
      'settings.sound': enabled
    });
    // 同步到音频管理器
    audioManager.setEnabled(enabled);
    this.saveSettings();

    // 如果开启音效，播放一个示例音效
    if (enabled) {
      audioManager.playKittenMeow();
    }
  },

  // 切换自动更新
  toggleAutoUpdate(e) {
    this.setData({
      'settings.autoUpdate': e.detail.value
    });
    this.saveSettings();
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有缓存数据吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorage({
            success: () => {
              wx.showToast({
                title: '清除成功',
                icon: 'success'
              });
              // 重新加载设置
              this.setData({
                settings: {
                  notification: true,
                  sound: true,
                  autoUpdate: true
                }
              });
            }
          });
        }
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          this.setData({
            userInfo: {
              nickName: '',
              avatarUrl: '',
              userId: '',
              isLogin: false
            }
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 修改昵称
  editNickName() {
    if (!this.data.userInfo.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '更新中...' });

          try {
            const { result } = await wx.cloud.callFunction({
              name: 'updateUserInfo',
              data: { nickName: res.content }
            });

            wx.hideLoading();

            if (result.code === 0) {
              const userInfo = {
                ...this.data.userInfo,
                nickName: res.content
              };
              wx.setStorageSync('userInfo', userInfo);
              this.setData({ userInfo });
              wx.showToast({ title: '修改成功', icon: 'success' });
            } else {
              wx.showToast({ title: result.msg || '修改失败', icon: 'none' });
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: '修改失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 更换头像
  changeAvatar() {
    if (!this.data.userInfo.isLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: '/pages/avatar-select/avatar-select?mode=profile'
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 点击用户区域（头像/用户名）
  onUserTap() {
    if (this.data.userInfo.isLogin) {
      // 已登录，显示操作菜单
      this.showUserMenu();
    } else {
      // 未登录，显示登录选项
      this.showLoginOptions();
    }
  },

  // 显示登录选项
  showLoginOptions() {
    wx.showActionSheet({
      itemList: ['微信一键登录', '快速体验（随机昵称）', '自定义昵称和头像'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.wechatLogin();
        } else if (res.tapIndex === 1) {
          this.quickLogin();
        } else if (res.tapIndex === 2) {
          this.customLogin();
        }
      }
    });
  },

  // 显示已登录用户的菜单
  showUserMenu() {
    wx.showActionSheet({
      itemList: ['修改昵称', '更换头像', '退出登录'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.editNickName();
        } else if (res.tapIndex === 1) {
          this.changeAvatar();
        } else if (res.tapIndex === 2) {
          this.logout();
        }
      }
    });
  },

  // 快速体验登录
  quickLogin() {
    wx.showLoading({ title: '登录中...' });
    const randomNames = ['橘喵', '胖橘', '三花', '狸花', '布偶', '英短', '美短', '暹罗', '缅因', '波斯', '金渐层', '银渐层', '蓝猫', '黑猫', '白猫'];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const userInfo = {
      nickName: randomName + Math.floor(Math.random() * 10000),
      avatarUrl: '',
      userId: 'user_' + Date.now(),
      isLogin: true
    };
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ userInfo });
    wx.hideLoading();
    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  // 微信登录
  wechatLogin() {
    wx.showLoading({ title: '登录中...' });
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        const userInfo = {
          nickName: profileRes.userInfo.nickName,
          avatarUrl: profileRes.userInfo.avatarUrl,
          userId: 'user_' + Date.now(),
          isLogin: true
        };
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ userInfo });
        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '已取消', icon: 'none' });
      }
    });
  },

  // 自定义登录
  customLogin() {
    wx.navigateTo({
      url: '/pages/avatar-select/avatar-select?mode=login'
    });
  }
});
