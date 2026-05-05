/**
 * 设置页面
 * 功能：用户信息展示/编辑、登录/退出、通知/音效/自动更新设置、缓存清理
 */
const audioManager = require('../../utils/audioManager');
const auth = require('../../utils/auth');

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
    auth.refreshUserInfo(this);
    this.loadSettings();
  },

  onShow() {
    auth.refreshUserInfo(this);
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
    auth.logout(() => {
      auth.refreshUserInfo(this);
    });
  },

  // 修改昵称
  editNickName() {
    if (!auth.isLoggedIn()) {
      auth.showLoginOptions((userInfo) => {
        auth.refreshUserInfo(this);
        this.editNickName();
      });
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
            auth.setUserInfo(userInfo);
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
    if (!auth.isLoggedIn()) {
      auth.showLoginOptions((userInfo) => {
        auth.refreshUserInfo(this);
        this.changeAvatar();
      });
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
      this.showUserMenu();
    } else {
      auth.showLoginOptions((userInfo) => {
        auth.refreshUserInfo(this);
      });
    }
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
  onShareAppMessage() {
    return {};
  }
});
