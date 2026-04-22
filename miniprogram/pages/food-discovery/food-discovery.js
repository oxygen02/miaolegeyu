const app = getApp();

// 渐变色配置 - 淡色系，相邻店铺有明显差异
const bgColors = [
  'linear-gradient(135deg, #FFF5E6 0%, #FFE4CC 100%)',  // 淡橙
  'linear-gradient(135deg, #F0F8FF 0%, #E6F3FF 100%)',  // 淡蓝
  'linear-gradient(135deg, #F5FFF5 0%, #E6FFE6 100%)',  // 淡绿
  'linear-gradient(135deg, #FFF0F5 0%, #FFE6F0 100%)',  // 淡粉
  'linear-gradient(135deg, #FFFAF0 0%, #FFF5E6 100%)',  // 淡黄
  'linear-gradient(135deg, #F8F0FF 0%, #F0E6FF 100%)',  // 淡紫
];

// 菜系映射
const cuisineMap = {
  'chinese': '中餐',
  'japanese': '日韩餐',
  'western': '西餐',
  'bbq': '烧烤',
  'hotpot': '火锅',
  'meat': '烤肉',
  'seafood': '海鲜',
  'crayfish': '小龙虾',
  'local': '地方特色',
  'dessert': '甜品',
  'tea': '奶茶',
  'cafe': '咖啡',
  'bar': '酒吧',
  'snack': '大排档'
};

Page({
  data: {
    shops: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    selectedCuisine: 'all',
    cuisines: [
      { id: 'all', name: '全部' },
      { id: 'chinese', name: '中餐' },
      { id: 'japanese', name: '日韩餐' },
      { id: 'western', name: '西餐' },
      { id: 'bbq', name: '烧烤' },
      { id: 'hotpot', name: '火锅' },
      { id: 'meat', name: '烤肉' },
      { id: 'seafood', name: '海鲜' },
      { id: 'crayfish', name: '小龙虾' },
      { id: 'local', name: '地方特色' },
      { id: 'dessert', name: '甜品' },
      { id: 'tea', name: '奶茶' },
      { id: 'cafe', name: '咖啡' },
      { id: 'bar', name: '酒吧' },
      { id: 'snack', name: '大排档' },
      { id: 'custom', name: '自定义' }
    ],
    // 图片预览
    previewVisible: false,
    previewImages: [],
    previewCurrent: 0,
    // 倒计时定时器
    countdownTimers: {}
  },

  async onLoad() {
    // 先加载店铺，再加载约饭数据
    await this.loadShops();
    console.log('店铺加载完成，数量:', this.data.shops.length);
    await this.loadAppointments();
    console.log('约饭数据加载完成');
  },

  async onShow() {
    // 页面显示时刷新数据
    if (this.data.shops.length > 0) {
      await this.loadAppointments();
    }
  },

  onUnload() {
    // 清除所有倒计时定时器
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    Promise.all([
      this.loadShops(),
      this.loadAppointments()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 加载店铺列表
  async loadShops() {
    this.setData({ loading: true });
    try {
      // 添加超时处理
      const callFunctionPromise = wx.cloud.callFunction({
        name: 'getShops',
        data: {
          page: 1,
          pageSize: this.data.pageSize,
          cuisine: this.data.selectedCuisine
        }
      });

      // 10秒超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000);
      });

      const { result } = await Promise.race([callFunctionPromise, timeoutPromise]);

      if (result.success) {
        const shops = result.shops.map((shop, index) => ({
          ...shop,
          pawRating: this.generatePawRating(shop.rating),
          bgColor: bgColors[index % bgColors.length],
          cuisineName: this.getCuisineName(shop.cuisine),
          createTimeStr: this.formatTimeAgo(shop.createTime)
        }));
        this.setData({
          shops,
          hasMore: shops.length >= this.data.pageSize
        });
      }
    } catch (err) {
      console.error('加载店铺失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  async loadMore() {
    const nextPage = this.data.page + 1;
    this.setData({ loading: true });
    try {
      // 添加超时处理
      const callFunctionPromise = wx.cloud.callFunction({
        name: 'getShops',
        data: {
          page: nextPage,
          pageSize: this.data.pageSize,
          cuisine: this.data.selectedCuisine
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000);
      });

      const { result } = await Promise.race([callFunctionPromise, timeoutPromise]);

      if (result.success) {
        const newShops = result.shops.map((shop, index) => ({
          ...shop,
          pawRating: this.generatePawRating(shop.rating),
          bgColor: bgColors[(this.data.shops.length + index) % bgColors.length],
          cuisineName: this.getCuisineName(shop.cuisine),
          createTimeStr: this.formatTimeAgo(shop.createTime)
        }));
        this.setData({
          shops: [...this.data.shops, ...newShops],
          page: nextPage,
          hasMore: newShops.length >= this.data.pageSize
        });
      }
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取菜系名称
  getCuisineName(cuisineId) {
    return cuisineMap[cuisineId] || cuisineId || '其他';
  },

  // 格式化时间（多久前）
  formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 加载约饭报名
  async loadAppointments() {
    try {
      console.log('开始加载约饭数据，当前店铺数:', this.data.shops.length);

      // 添加超时处理
      const callFunctionPromise = wx.cloud.callFunction({
        name: 'getDiningAppointments'
      });

      // 10秒超时
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000);
      });

      const { result } = await Promise.race([callFunctionPromise, timeoutPromise]);

      console.log('约饭数据返回:', result);

      if (result.success) {
        // 将约饭信息按店铺ID分组
        const appointmentsMap = {};
        result.appointments.forEach(app => {
          // 确保 shopId 是字符串类型
          const shopId = app.shopId ? String(app.shopId) : '';
          console.log('处理约饭数据:', shopId, app);
          if (!appointmentsMap[shopId]) {
            appointmentsMap[shopId] = [];
          }
          appointmentsMap[shopId].push({
            ...app,
            countdownText: this.formatCountdown(app.remainingTime),
            appointmentTimeStr: this.formatAppointmentTime(app.appointmentTime)
          });
        });

        console.log('appointmentsMap:', appointmentsMap);

        const updatedShops = this.data.shops.map(shop => {
          // 处理 _id 可能是对象或字符串的情况
          const shopId = shop._id ? String(shop._id) : '';
          const appointments = appointmentsMap[shopId] || [];
          console.log('店铺:', shopId, shop.name, '关联约饭:', appointments.length, '个活动');
          return {
            ...shop,
            appointments: appointments,
            hasAppointment: appointments.length > 0,
            currentAppointmentIndex: 1
          };
        });

        console.log('更新店铺数据:', updatedShops.length, '个店铺');
        this.setData({ shops: updatedShops });

        // 启动倒计时
        this.startCountdowns(result.appointments);
      }
    } catch (err) {
      console.error('加载约饭报名失败:', err);
    }
  },

  // 启动倒计时
  startCountdowns(appointments) {
    // 清除旧定时器
    Object.values(this.data.countdownTimers).forEach(timer => {
      clearInterval(timer);
    });

    const timers = {};
    appointments.forEach(app => {
      if (app.remainingTime > 0) {
        timers[app._id] = setInterval(() => {
          const remaining = app.remainingTime - 1000;
          app.remainingTime = remaining;
          
          if (remaining <= 0) {
            clearInterval(timers[app._id]);
            this.loadAppointments(); // 刷新数据
          } else {
            // 更新倒计时显示
            const shops = this.data.shops.map(shop => {
              if (shop.appointment && shop.appointment._id === app._id) {
                return {
                  ...shop,
                  appointment: {
                    ...shop.appointment,
                    countdownText: this.formatCountdown(remaining)
                  }
                };
              }
              return shop;
            });
            this.setData({ shops });
          }
        }, 1000);
      }
    });

    this.setData({ countdownTimers: timers });
  },

  // 格式化倒计时
  formatCountdown(remainingTime) {
    if (remainingTime <= 0) return '已截止';

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `剩余 ${hours}时${minutes}分`;
    } else if (minutes > 0) {
      return `剩余 ${minutes}分${seconds}秒`;
    } else {
      return `剩余 ${seconds}秒`;
    }
  },

  // 格式化约饭时间
  formatAppointmentTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
    const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
    const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
    const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return `${month}/${day} ${hour}:${minute}`;
  },

  // 点击地址导航
  onAddressTap(e) {
    e.stopPropagation();
    const { address, name } = e.currentTarget.dataset;

    if (!address) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    // 打开地图选择导航
    wx.showActionSheet({
      itemList: ['使用腾讯地图导航', '复制地址'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 使用腾讯地图
          wx.openLocation({
            name: name || '目的地',
            address: address,
            latitude: 0,
            longitude: 0,
            fail: () => {
              // 如果无法直接打开，尝试使用地址搜索
              wx.navigateTo({
                url: `/pages/address-nav/address-nav?address=${encodeURIComponent(address)}&name=${encodeURIComponent(name || '')}`
              });
            }
          });
        } else if (res.tapIndex === 1) {
          // 复制地址
          wx.setClipboardData({
            data: address,
            success: () => {
              wx.showToast({ title: '地址已复制', icon: 'success' });
            }
          });
        }
      }
    });
  },

  generatePawRating(rating) {
    const count = Math.round(rating) || 3;
    return Array(5).fill(0).map((_, i) => i < count);
  },

  onCuisineTap(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ selectedCuisine: id, page: 1 });
    this.loadShops();
    this.loadAppointments();
  },

  // 约饭活动翻页切换
  onAppointmentSwiperChange(e) {
    const { current } = e.detail;
    const { shopIndex } = e.currentTarget.dataset;

    // 更新当前店铺的约饭活动索引
    const shops = this.data.shops.map((shop, index) => {
      if (index === parseInt(shopIndex)) {
        return {
          ...shop,
          currentAppointmentIndex: current + 1
        };
      }
      return shop;
    });

    this.setData({ shops });
  },

  // 第一条店铺的约饭活动翻页切换
  onFirstShopSwiperChange(e) {
    const { current } = e.detail;
    const shops = this.data.shops.map((shop, index) => {
      if (index === 0) {
        return {
          ...shop,
          currentAppointmentIndex: current + 1
        };
      }
      return shop;
    });
    this.setData({ shops });
  },

  // 第一条店铺的约饭活动参加
  onFirstShopAppointmentAction(e) {
    e.stopPropagation();
    const { appointment } = e.currentTarget.dataset;
    // 复用原有的参加逻辑
    this.onAppointmentAction({
      ...e,
      currentTarget: {
        dataset: { appointment }
      }
    });
  },

  // 第一条店铺的发起约饭
  onFirstShopCreateAppointment(e) {
    e.stopPropagation();
    const { shop } = e.currentTarget.dataset;
    // 复用原有的发起约饭逻辑
    this.onCreateAppointmentTap({
      ...e,
      currentTarget: {
        dataset: { shop }
      }
    });
  },

  // 点击整个店铺条目 - 跳转到详情
  onShopItemTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${id}`
    });
  },

  // 点击缩略图 - 预览图片
  onThumbTap(e) {
    e.stopPropagation();
    const { index } = e.currentTarget.dataset;
    const shop = this.data.shops[index];
    if (!shop.images || shop.images.length === 0) {
      wx.showToast({ title: '暂无图片', icon: 'none' });
      return;
    }
    this.setData({
      previewVisible: true,
      previewImages: shop.images,
      previewCurrent: 0
    });
  },

  // 关闭图片预览
  closePreview(e) {
    e.stopPropagation();
    this.setData({
      previewVisible: false,
      previewImages: [],
      previewCurrent: 0
    });
  },

  // 预览图片切换
  onPreviewChange(e) {
    this.setData({
      previewCurrent: e.detail.current
    });
  },

  // 阻止预览图片点击冒泡
  onPreviewImageTap(e) {
    e.stopPropagation();
  },

  // 点击发起约饭按钮 - 跳转到店铺详情页
  onCreateAppointmentTap(e) {
    // catchtap 不需要 stopPropagation，它会自动阻止冒泡
    const { shop } = e.currentTarget.dataset;
    // 跳转到店铺详情页发起约饭
    wx.navigateTo({
      url: `/pages/shop-detail/shop-detail?id=${shop._id}&openAppointment=1`
    });
  },

  // 点击参加按钮
  async onAppointmentAction(e) {
    e.stopPropagation();
    const { appointment } = e.currentTarget.dataset;

    if (appointment.isJoined) {
      wx.showToast({ title: '您已经参加啦', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      // 添加超时处理
      const callFunctionPromise = wx.cloud.callFunction({
        name: 'joinDiningAppointment',
        data: { appointmentId: appointment._id }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 10000);
      });

      const { result } = await Promise.race([callFunctionPromise, timeoutPromise]);

      if (result.success) {
        wx.showToast({ title: '参加成功', icon: 'success' });
        this.loadAppointments();
      } else {
        wx.showToast({ title: result.error || '参加失败', icon: 'none' });
      }
    } catch (err) {
      console.error('参加约饭失败:', err);
      wx.showToast({ title: '参加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onUploadTap() {
    wx.navigateTo({
      url: '/pages/upload-shop/upload-shop'
    });
  },

  onShareAppMessage() {
    return {
      title: '发现美食 - 喵了个鱼',
      path: '/pages/food-discovery/food-discovery'
    };
  }
});
