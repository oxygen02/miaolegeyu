Page({
  data: {
    avatars: [],
    currentCategory: '',
    keyword: '',
    selectedAvatar: '',
    selectedAvatarUrl: '',
    page: 1,
    pageSize: 200, // 一次性加载所有头像（174个）
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.loadAvatars();
  },

  // 加载头像列表
  async loadAvatars(reset = false) {
    if (this.data.loading) return;
    
    const page = reset ? 1 : this.data.page;
    
    this.setData({ loading: true });
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getAvatars',
        data: {
          category: this.data.currentCategory,
          keyword: this.data.keyword,
          page,
          pageSize: this.data.pageSize
        }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      let { avatars, hasMore } = result.data;

      // 处理头像图片路径 - 转换为 cloud:// 格式
      // 格式: cloud://环境ID.存储空间/文件路径
      const ENV_ID = 'cloud1-d5ggnf5wh2d872f3c';
      const STORAGE_NAME = '636c-cloud1-d5ggnf5wh2d872f3c-1423896909'; // 从截图中看到的存储空间名称
      avatars = avatars.map(item => {
        console.log('Processing avatar:', item.name, 'cloudPath:', item.cloudPath, 'current imageUrl:', item.imageUrl);
        // 如果已经有 http 或 cloud:// 链接，直接使用
        if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('cloud://'))) {
          return item;
        }
        // 使用 cloudPath 构建 cloud:// 路径
        if (item.cloudPath) {
          const newImageUrl = `cloud://${ENV_ID}.${STORAGE_NAME}/${item.cloudPath}`;
          console.log('New imageUrl:', newImageUrl);
          return {
            ...item,
            imageUrl: newImageUrl
          };
        }
        return item;
      });

      this.setData({
        avatars: reset ? avatars : [...this.data.avatars, ...avatars],
        hasMore,
        page: page + 1,
        loading: false
      }, () => {
        // 确认数据已更新
        console.log('setData completed, first avatar imageUrl:', this.data.avatars[0]?.imageUrl);
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

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category,
      page: 1,
      avatars: []
    });
    this.loadAvatars(true);
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({
      keyword: e.detail.value
    });
  },

  // 执行搜索
  onSearch() {
    this.setData({
      page: 1,
      avatars: []
    });
    this.loadAvatars(true);
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

  // 确认选择
  confirmSelect() {
    if (!this.data.selectedAvatar) {
      wx.showToast({
        title: '请先选择头像',
        icon: 'none'
      });
      return;
    }

    // 保存到本地存储
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.avatarUrl = this.data.selectedAvatarUrl;
    wx.setStorageSync('userInfo', userInfo);

    // 返回上一页
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      prevPage.setData({
        'userInfo.avatarUrl': this.data.selectedAvatarUrl
      });
    }

    wx.showToast({
      title: '选择成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
});
