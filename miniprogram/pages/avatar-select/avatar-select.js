const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    avatars: [],
    allAvatars: [], // 全量数据，用于前端搜索过滤
    currentCategory: '',
    keyword: '',
    selectedAvatar: '',
    selectedAvatarUrl: '',
    page: 1,
    pageSize: 200, // 一次性加载所有头像（174个）
    hasMore: true,
    loading: false,
    imagePaths: imagePaths,
    // 登录模式相关
    isLoginMode: false,
    nickName: '',
    showNickNameInput: false
  },

  onLoad(options) {
    // 判断是否为登录模式
    const isLoginMode = options.mode === 'login';
    this.setData({
      isLoginMode,
      showNickNameInput: isLoginMode
    });

    this.loadAvatars();
  },

  // 加载头像列表
  async loadAvatars(reset = false) {
    if (this.data.loading) return;

    // 如果已有全量数据，直接做前端过滤
    if (this.data.allAvatars.length > 0 && !reset) {
      this.filterAvatars();
      return;
    }

    this.setData({ loading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getAvatars',
        data: {
          category: this.data.currentCategory,
          keyword: this.data.keyword,
          page: 1,
          pageSize: this.data.pageSize
        }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      let { avatars } = result.data;

      // 处理头像图片路径 - 转换为 cloud:// 格式
      const ENV_ID = 'cloud1-d5ggnf5wh2d872f3c';
      const STORAGE_NAME = '636c-cloud1-d5ggnf5wh2d872f3c-1423896909';
      avatars = avatars.map(item => {
        if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('cloud://'))) {
          return item;
        }
        if (item.cloudPath) {
          const newImageUrl = `cloud://${ENV_ID}.${STORAGE_NAME}/${item.cloudPath}`;
          return {
            ...item,
            imageUrl: newImageUrl
          };
        }
        return item;
      });

      // 去掉名称前面的 "XX_" 序号前缀，保留文字和文字后的数字
      avatars = avatars.map(item => {
        if (item.name) {
          item.name = item.name.replace(/^\d{2}_/, '');
        }
        return item;
      });

      // 保存到全量数据
      this.setData({
        allAvatars: avatars,
        loading: false
      }, () => {
        // 过滤并显示
        this.filterAvatars();
      });
    } catch (err) {
      console.error('加载头像失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 前端过滤头像（按分类 + 关键词）
  filterAvatars() {
    let filtered = this.data.allAvatars;

    // 按分类过滤
    if (this.data.currentCategory) {
      filtered = filtered.filter(item => item.category === this.data.currentCategory);
    }

    // 按关键词过滤（搜索名称）
    if (this.data.keyword && this.data.keyword.trim()) {
      const kw = this.data.keyword.trim().toLowerCase();
      filtered = filtered.filter(item =>
        (item.name && item.name.toLowerCase().includes(kw)) ||
        (item.category && item.category.toLowerCase().includes(kw))
      );
    }

    this.setData({
      avatars: filtered,
      hasMore: false
    });
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.filterAvatars();
  },

  // 搜索输入（实时搜索）
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.filterAvatars();
  },

  // 执行搜索（保留兼容）
  onSearch() {
    this.filterAvatars();
  },

  // 选择头像
  selectAvatar(e) {
    const { id, url } = e.currentTarget.dataset;
    this.setData({
      selectedAvatar: id,
      selectedAvatarUrl: url
    });
  },

  // 加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadAvatars();
    }
  },

  // 返回
  goBack() {
    wx.navigateBack();
  },

  // 昵称输入
  onNickNameInput(e) {
    this.setData({
      nickName: e.detail.value
    });
  },

  // 确认选择
  async confirmSelect() {
    if (!this.data.selectedAvatar) {
      wx.showToast({
        title: '请先选择头像',
        icon: 'none'
      });
      return;
    }

    // 登录模式下，检查昵称
    if (this.data.isLoginMode) {
      if (!this.data.nickName.trim()) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'none'
        });
        return;
      }
      // 执行登录
      this.doLogin();
      return;
    }

    // 非登录模式，保存头像
    this.saveAvatar();
  },

  // 执行登录（登录模式）
  async doLogin() {
    wx.showLoading({ title: '登录中...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          nickName: this.data.nickName.trim(),
          avatarUrl: this.data.selectedAvatarUrl,
          isCustom: true
        }
      });

      wx.hideLoading();

      if (result.code === 0) {
        const userData = {
          ...result.data,
          isLogin: true
        };

        // 保存到本地存储，使用 auth 模块
        const auth = require('../../utils/auth');
        auth.setUserInfo(userData);

        wx.showToast({ title: '登录成功', icon: 'success' });

        // 返回个人中心页
        setTimeout(() => {
          wx.navigateBack();
          // 通知上一页刷新
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.setData) {
            prevPage.setData({ userInfo: userData });
            if (prevPage.loadStats) {
              prevPage.loadStats();
            }
          }
        }, 1000);
      } else {
        wx.showToast({ title: result.msg || '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败:', err);
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  // 保存头像（非登录模式）
  async saveAvatar() {
    wx.showLoading({ title: '保存中...' });

    try {
      console.log('选择的头像URL:', this.data.selectedAvatarUrl);
      // 调用云函数更新数据库
      const { result } = await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: {
          avatarUrl: this.data.selectedAvatarUrl
        }
      });
      console.log('updateUserInfo 结果:', result);

      if (result.code !== 0) {
        throw new Error(result.msg || '更新失败');
      }

      // 保存到本地存储，使用 auth 模块
      const auth = require('../../utils/auth');
      const userInfo = auth.getUserInfo() || {};
      userInfo.avatarUrl = this.data.selectedAvatarUrl;
      auth.setUserInfo(userInfo);

      // 返回上一页
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({
          'userInfo.avatarUrl': this.data.selectedAvatarUrl
        });
        // 如果上一页是profile页且当前显示的是我发起的聚餐列表，刷新列表
        if (prevPage.route === 'pages/profile/profile' && prevPage.data.currentList === 'myRooms') {
          prevPage.loadMyRooms();
        }
      }

      wx.hideLoading();
      wx.showToast({
        title: '选择成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      wx.hideLoading();
      console.error('保存头像失败:', err);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});
