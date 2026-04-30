const { imagePaths } = require('../../config/imageConfig');

// 模拟餐厅图片 - 使用本地占位图
const mockImages = [
  '/assets/images/location.png',
  '/assets/images/share.png',
  '/assets/images/location.png',
  '/assets/images/share.png',
  '/assets/images/location.png'
];

Page({
  data: {
    imagePaths: imagePaths,
    // 模拟房间数据
    room: {
      title: '51彭州小聚',
      location: '彭州小鱼洞',
      mode: 'b',
      enableRestaurantRecommend: true,
      voteDeadline: '2025-05-01T16:00:00',
      activityDate: '2025-05-03',
      activityTime: '12:00',
      status: 'locked'
    },
    // 模拟投票统计
    voteStats: {
      bestMatches: [
        { categoryName: '川菜', subCategoryName: '火锅', voterCount: 5, matchType: 'perfect' },
        { categoryName: '烧烤', subCategoryName: '烤肉', voterCount: 3, matchType: 'strong' },
        { categoryName: '川菜', subCategoryName: '麻辣烫', voterCount: 2, matchType: 'good' }
      ],
      tabooStats: ['香菜', '内脏', '折耳根']
    },
    // 模拟推荐餐厅
    restaurants: [],
    loading: false,
    step: 1, // 当前步骤：1-创建房间, 2-投票结果, 3-推荐餐厅
    showRestaurantDetail: false,
    selectedRestaurant: null
  },

  onLoad() {
    this.generateMockRestaurants();
  },

  // 生成模拟餐厅数据
  generateMockRestaurants() {
    const mockData = [
      {
        name: '老成都火锅',
        rating: 4.8,
        avgPrice: 89,
        distance: 0.8,
        distanceText: '800m',
        address: '彭州市小鱼洞镇建国路88号',
        phone: '028-12345678',
        cuisineType: '火锅',
        tags: ['正宗', '麻辣', '排队王'],
        openTime: '10:00-22:00',
        highlight: '招牌毛肚，现切牛肉',
        image: mockImages[0]
      },
      {
        name: '川西坝子',
        rating: 4.6,
        avgPrice: 78,
        distance: 1.2,
        distanceText: '1.2km',
        address: '彭州市小鱼洞镇商业街12号',
        phone: '028-87654321',
        cuisineType: '火锅',
        tags: ['环境好', '适合聚餐'],
        openTime: '11:00-23:00',
        highlight: '免费小吃，水果自助',
        image: mockImages[1]
      },
      {
        name: '蜀大侠火锅',
        rating: 4.5,
        avgPrice: 95,
        distance: 1.5,
        distanceText: '1.5km',
        address: '彭州市小鱼洞镇滨河路66号',
        phone: '028-11223344',
        cuisineType: '火锅',
        tags: ['网红店', '拍照好看'],
        openTime: '10:30-22:30',
        highlight: '熊猫造型锅底，创意菜品',
        image: mockImages[2]
      },
      {
        name: '烧烤大排档',
        rating: 4.3,
        avgPrice: 65,
        distance: 0.5,
        distanceText: '500m',
        address: '彭州市小鱼洞镇夜市街20号',
        phone: '028-55667788',
        cuisineType: '烧烤',
        tags: ['夜宵', '啤酒'],
        openTime: '18:00-02:00',
        highlight: '秘制烤串，冰镇啤酒',
        image: mockImages[3]
      },
      {
        name: '日式料理屋',
        rating: 4.7,
        avgPrice: 128,
        distance: 2.0,
        distanceText: '2.0km',
        address: '彭州市小鱼洞镇光华路15号',
        phone: '028-99887766',
        cuisineType: '日料',
        tags: ['新鲜', '安静'],
        openTime: '11:00-21:00',
        highlight: '每日空运海鲜，榻榻米包间',
        image: mockImages[4]
      }
    ];

    this.setData({ restaurants: mockData });
  },

  // 切换步骤
  goToStep(e) {
    const step = parseInt(e.currentTarget.dataset.step);
    this.setData({ step });
  },

  // 下一步
  nextStep() {
    const next = this.data.step + 1;
    if (next <= 3) {
      this.setData({ step: next });
    }
  },

  // 上一步
  prevStep() {
    const prev = this.data.step - 1;
    if (prev >= 1) {
      this.setData({ step: prev });
    }
  },

  // 查看餐厅详情
  showDetail(e) {
    const index = e.currentTarget.dataset.index;
    const restaurant = this.data.restaurants[index];
    this.setData({
      showRestaurantDetail: true,
      selectedRestaurant: restaurant
    });
  },

  // 关闭详情
  closeDetail() {
    this.setData({
      showRestaurantDetail: false,
      selectedRestaurant: null
    });
  },

  // 导航到餐厅
  navigateToRestaurant() {
    const restaurant = this.data.selectedRestaurant;
    if (!restaurant) return;

    wx.showModal({
      title: '导航',
      content: `即将导航到：${restaurant.name}`,
      confirmText: '打开地图',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '模拟打开地图导航',
            icon: 'none'
          });
        }
      }
    });
  },

  // 拨打电话
  callRestaurant() {
    const phone = this.data.selectedRestaurant?.phone;
    if (!phone) {
      wx.showToast({ title: '暂无电话', icon: 'none' });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.showToast({ title: '拨打失败', icon: 'none' });
      }
    });
  },

  // 选择餐厅（模拟确定聚餐地点）
  selectRestaurant() {
    const restaurant = this.data.selectedRestaurant;
    wx.showModal({
      title: '确定聚餐地点',
      content: `选择「${restaurant.name}」作为聚餐地点？`,
      confirmText: '确定',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已选择聚餐地点',
            icon: 'success'
          });
          this.closeDetail();
        }
      }
    });
  },

  // 重新搜索
  refreshSearch() {
    this.setData({ loading: true });
    setTimeout(() => {
      // 随机打乱餐厅顺序模拟新结果
      const restaurants = [...this.data.restaurants].sort(() => Math.random() - 0.5);
      this.setData({
        restaurants,
        loading: false
      });
      wx.showToast({ title: '已刷新推荐', icon: 'success' });
    }, 1000);
  },

  // 跳转到真实的推荐餐厅页面
  goToRealRecommend() {
    wx.showModal({
      title: '提示',
      content: '这将跳转到真实的推荐餐厅页面（需要真实房间ID）',
      confirmText: '跳转',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/recommend-restaurant/recommend-restaurant?roomId=demo123&cuisineType=火锅'
          });
        }
      }
    });
  }
});
