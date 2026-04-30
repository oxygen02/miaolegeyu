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
  }
});
