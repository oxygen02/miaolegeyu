Page({
  data: {
    activeTab: 'ongoing',
    ongoingCount: 0,
    myCount: 0,
    showCreateModal: false,
    // 正在进行的活动
    ongoingActivities: [
      {
        id: 1,
        type: 'meal',
        typeName: '拼饭',
        title: '午餐拼单',
        shopName: '麦当劳',
        time: '12:00',
        participantCount: 5,
        image: '/assets/images/juze_avatar.png',
        status: 'ongoing',
        statusName: '进行中',
        isJoined: true,
        currentAmount: 64,
        targetAmount: 100,
        progress: 64,
        remaining: 36
      },
      {
        id: 2,
        type: 'milktea',
        typeName: '拼奶茶',
        title: '下午茶拼单',
        shopName: '喜茶',
        time: '15:00',
        participantCount: 3,
        image: '/assets/images/juze_avatar.png',
        status: 'ongoing',
        statusName: '进行中',
        isJoined: false,
        currentAmount: 45,
        targetAmount: 50,
        progress: 90,
        remaining: 5
      },
      {
        id: 3,
        type: 'dining',
        typeName: '聚餐',
        title: '周五聚餐',
        shopName: '海底捞',
        time: '18:30',
        participantCount: 8,
        image: '/assets/images/juze_avatar.png',
        status: 'ongoing',
        statusName: '报名中',
        isJoined: true
      }
    ],
    // 我发起的活动
    myActivities: [
      {
        id: 4,
        type: 'group',
        typeName: '拼单',
        title: '办公室零食拼单',
        shopName: '京东超市',
        time: '17:00',
        participantCount: 6,
        image: '/assets/images/juze_avatar.png',
        status: 'ongoing',
        statusName: '进行中',
        currentAmount: 120,
        targetAmount: 200,
        progress: 60,
        remaining: 80
      }
    ],
    // 历史参与
    historyActivities: [
      {
        id: 5,
        type: 'meal',
        typeName: '拼饭',
        title: '昨日午餐',
        shopName: '肯德基',
        time: '昨天 12:00',
        participantCount: 4,
        image: '/assets/images/juze_avatar.png',
        status: 'completed',
        statusName: '已完成'
      },
      {
        id: 6,
        type: 'milktea',
        typeName: '拼奶茶',
        title: '上周下午茶',
        shopName: '奈雪的茶',
        time: '上周三 15:00',
        participantCount: 5,
        image: '/assets/images/juze_avatar.png',
        status: 'completed',
        statusName: '已完成'
      }
    ]
  },

  onLoad(options) {
    console.log('喵不喵页面加载', options);
    this.calculateCounts();
  },

  onShow() {
    // 更新 tabBar 选中状态
    this.updateTabBarSelected();
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 1 });
    }
  },

  calculateCounts() {
    const { ongoingActivities, myActivities } = this.data;
    this.setData({
      ongoingCount: ongoingActivities.length,
      myCount: myActivities.length
    });
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 显示创建选项
  showCreateOptions() {
    this.setData({ showCreateModal: true });
  },

  // 关闭创建弹窗
  closeCreateModal() {
    this.setData({ showCreateModal: false });
  },

  // 阻止冒泡
  preventBubble() {
    // 阻止事件冒泡
  },

  // 创建拼单
  createGroupOrder(e) {
    const type = e.currentTarget.dataset.type;
    this.closeCreateModal();
    wx.navigateTo({
      url: `/pages/create-group-order/create-group-order?type=${type}`
    });
  },

  // 创建聚餐
  createDining() {
    this.closeCreateModal();
    wx.navigateTo({
      url: '/pages/create/create'
    });
  },

  // 跳转到活动详情
  goToActivityDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '活动详情',
      content: '功能开发中，敬请期待',
      showCancel: false
    });
  },

  // 跳转到外卖平台
  goToPlatform(e) {
    const type = e.currentTarget.dataset.type;
    wx.showModal({
      title: '外卖平台',
      content: `即将跳转到${type === 'lunch' ? '午餐' : type === 'dinner' ? '晚餐' : '奶茶'}平台`,
      showCancel: false
    });
  },

  // 跳转到发现美食
  goToFoodDiscovery() {
    wx.navigateTo({
      url: '/pages/food-discovery/food-discovery'
    });
  },

  onShareAppMessage() {
    return {
      title: '来喵不喵一起拼单',
      path: '/pages/fish-tank/fish-tank'
    };
  }
});
