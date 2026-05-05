const app = getApp();
const { imagePaths } = require('../../config/imageConfig');

// 渐变色配置 - 淡色系，相邻店铺有明显差异
const bgColors = [
  'linear-gradient(135deg, #FFF5E6 0%, #FFE4CC 100%)',  // 淡橙
  'linear-gradient(135deg, #F0F8FF 0%, #E6F3FF 100%)',  // 淡蓝
  'linear-gradient(135deg, #F5FFF5 0%, #E6FFE6 100%)',  // 淡绿
  'linear-gradient(135deg, #FFF0F5 0%, #FFE6F0 100%)',  // 淡粉
  'linear-gradient(135deg, #FFFAF0 0%, #FFF5E6 100%)',  // 淡黄
  'linear-gradient(135deg, #F8F0FF 0%, #F0E6FF 100%)',  // 淡紫
];

// 菜系映射 - 包含20个大类和上传店铺的简化分类
const cuisineMap = {
  // 20个大类（Mode B 使用）
  'chuanyu': '川渝',
  'xianggan': '湘赣',
  'yueshi': '粤式',
  'jiangnan': '江南',
  'beifang': '北方',
  'xibei': '西北',
  'yungui': '云贵',
  'huazhong': '华中',
  'huoguo': '火锅',
  'chuanchuan': '串串',
  'shaokao': '烧烤',
  'longxia': '龙虾',
  'riliao': '日料',
  'hanliao': '韩料',
  'dongnanya': '东南亚',
  'xishi': '西式',
  'haixian': '海鲜',
  'zizhu': '自助',
  'nongjia': '农家',
  'sifang': '私房',
  // 上传店铺使用的简化分类
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
  'snack': '小吃',
  'fastfood': '快餐',
  'bread': '面包',
  'fruit': '水果',
  'other': '其他'
};

Page({
  data: {
    imagePaths: imagePaths,
    shops: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    selectedCuisine: 'all',
    // 高频标签（始终显示）
    hotCuisines: [
      { id: 'all', name: '全部' },
      { id: 'chuanyu', name: '川渝' },
      { id: 'beifang', name: '北方' },
      { id: 'yungui', name: '云贵' },
      { id: 'huoguo', name: '火锅' },
      { id: 'shaokao', name: '烧烤' },
      { id: 'haixian', name: '海鲜' },
      { id: 'riliao', name: '日料' },
      { id: 'xishi', name: '西式' },
      { id: 'dongnanya', name: '东南亚' },
      { id: 'longxia', name: '小龙虾' },
      { id: 'dessert', name: '甜品' }
    ],
    // 低频标签（展开后显示）
    moreCuisines: [
      { id: 'xianggan', name: '湘赣' },
      { id: 'yueshi', name: '粤式' },
      { id: 'jiangnan', name: '江南' },
      { id: 'xibei', name: '西北' },
      { id: 'huazhong', name: '华中' },
      { id: 'chuanchuan', name: '串串' },
      { id: 'hanliao', name: '韩料' },
      { id: 'zizhu', name: '自助' },
      { id: 'nongjia', name: '农家' },
      { id: 'sifang', name: '私房' },
      { id: 'snack', name: '小吃' },
      { id: 'fastfood', name: '快餐' },
    ],
    // 标签展开状态
    isCuisineExpanded: false,
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
    // 加载用户的约饭意向
    await this.loadMyInterests();
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
        // 使用闭包保存当前剩余时间
        let currentRemaining = app.remainingTime;
        
        timers[app._id] = setInterval(() => {
          currentRemaining -= 1000;
          
          if (currentRemaining <= 0) {
            clearInterval(timers[app._id]);
            this.loadAppointments(); // 刷新数据
          } else {
            // 只更新特定的约饭数据，而不是整个shops数组
            const newCountdownText = this.formatCountdown(currentRemaining);
            this.updateAppointmentCountdown(app._id, newCountdownText);
          }
        }, 1000);
      }
    });

    this.setData({ countdownTimers: timers });
  },

  // 只更新特定约饭的倒计时，避免整个列表重新渲染
  updateAppointmentCountdown(appointmentId, countdownText) {
    const shops = this.data.shops;
    let needUpdate = false;
    
    // 找到需要更新的店铺和约饭
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      if (shop.appointments && shop.appointments.length > 0) {
        for (let j = 0; j < shop.appointments.length; j++) {
          if (shop.appointments[j]._id === appointmentId) {
            // 使用路径更新，避免替换整个对象
            const key = `shops[${i}].appointments[${j}].countdownText`;
            this.setData({ [key]: countdownText });
            needUpdate = true;
            break;
          }
        }
        if (needUpdate) break;
      }
    }
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

  // 格式化约饭时间（转换为北京时间 UTC+8）
  formatAppointmentTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const month = (beijingDate.getUTCMonth() + 1 < 10 ? '0' : '') + (beijingDate.getUTCMonth() + 1);
    const day = (beijingDate.getUTCDate() < 10 ? '0' : '') + beijingDate.getUTCDate();
    const hour = (beijingDate.getUTCHours() < 10 ? '0' : '') + beijingDate.getUTCHours();
    const minute = (beijingDate.getUTCMinutes() < 10 ? '0' : '') + beijingDate.getUTCMinutes();
    return `${month}/${day} ${hour}:${minute}`;
  },

  // 点击地址导航
  onAddressTap(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const { address, name } = e.currentTarget.dataset;
    this.openLocationAction(address, name);
  },

  // 打开位置导航
  openLocation(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const { address, name } = e.currentTarget.dataset;
    this.openLocationAction(address, name);
  },

  // 打开位置导航的具体实现
  openLocationAction(address, name) {
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

  // 展开/收起标签
  toggleCuisineExpand() {
    this.setData({
      isCuisineExpanded: !this.data.isCuisineExpanded
    });
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

  // 点击发起约饭按钮 - 先查询意向用户，再跳转
  async onCreateAppointmentTap(e) {
    const { shop } = e.currentTarget.dataset;

    try {
      // 查询对该店铺感兴趣的用户
      const { result } = await wx.cloud.callFunction({
        name: 'getShopInterests',
        data: { shopId: shop._id }
      });

      if (result.success && result.count > 0) {
        // 有意向用户，显示提示弹窗
        wx.showModal({
          title: '提示',
          content: `有 ${result.count} 位喵友对「${shop.name}」感兴趣，发起约饭后将通知他们。`,
          confirmText: '发起约饭',
          cancelText: '再想想',
          success: (res) => {
            if (res.confirm) {
              // 用户确认，跳转到店铺详情页发起约饭
              wx.navigateTo({
                url: `/pages/shop-detail/shop-detail?id=${shop._id}&openAppointment=1&notifyInterested=1`
              });
            }
          }
        });
      } else {
        // 没有意向用户，直接跳转
        wx.navigateTo({
          url: `/pages/shop-detail/shop-detail?id=${shop._id}&openAppointment=1`
        });
      }
    } catch (err) {
      console.error('查询意向用户失败:', err);
      // 查询失败，直接跳转
      wx.navigateTo({
        url: `/pages/shop-detail/shop-detail?id=${shop._id}&openAppointment=1`
      });
    }
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

  // 导航到店铺
  navigateToShop(e) {
    e.stopPropagation();
    const { shop } = e.currentTarget.dataset;
    if (!shop || !shop.location) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    // 显示导航选项
    wx.showActionSheet({
      itemList: ['查看距离', '导航到店铺', '复制地址'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查看距离 - 获取用户位置并计算距离
          this.calculateDistance(shop);
        } else if (res.tapIndex === 1) {
          // 导航到店铺
          this.openLocationAction(shop.location, shop.name);
        } else if (res.tapIndex === 2) {
          // 复制地址
          wx.setClipboardData({
            data: shop.location,
            success: () => {
              wx.showToast({ title: '地址已复制', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 计算距离
  calculateDistance(shop) {
    wx.showLoading({ title: '计算距离中...' });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;

        // 使用腾讯地图SDK计算距离（需要配置key）
        // 这里简化处理，实际应该调用地图API进行地址解析和距离计算
        wx.request({
          url: 'https://apis.map.qq.com/ws/geocoder/v1/',
          data: {
            address: shop.location,
            key: 'YOUR_TENCENT_MAP_KEY' // 需要替换为实际的key
          },
          success: (geoRes) => {
            wx.hideLoading();
            if (geoRes.data && geoRes.data.status === 0) {
              const location = geoRes.data.result.location;
              const distance = this.getDistance(latitude, longitude, location.lat, location.lng);

              wx.showModal({
                title: '距离信息',
                content: `您距离「${shop.name}」约 ${distance}`,
                confirmText: '去导航',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openLocation({
                      latitude: location.lat,
                      longitude: location.lng,
                      name: shop.name,
                      address: shop.location
                    });
                  }
                }
              });
            } else {
              wx.showToast({ title: '无法获取位置信息', icon: 'none' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: '距离计算失败', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '需要授权',
          content: '开启位置权限后，可计算店铺与您的距离并排序展示',
          confirmText: '去开启',
          cancelText: '暂不需要',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 计算两点间距离（简化版，使用直线距离）
  getDistance(lat1, lng1, lat2, lng2) {
    const radLat1 = lat1 * Math.PI / 180.0;
    const radLat2 = lat2 * Math.PI / 180.0;
    const a = radLat1 - radLat2;
    const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0;
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    s = s * 6378.137; // 地球半径
    s = Math.round(s * 10000) / 10000;

    if (s < 1) {
      return Math.round(s * 1000) + '米';
    } else {
      return s.toFixed(1) + '公里';
    }
  },

  // 位置图标加载失败
  onLocationIconError(e) {
    console.error('位置图标加载失败:', e);
    this.setData({ locationIconError: true });
  },

  // 加载用户的约饭意向
  async loadMyInterests() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyDiningInterests'
      });

      if (result.success) {
        const interestedShopIds = result.shopIds || [];
        // 更新店铺列表中的意向状态
        const shops = this.data.shops.map(shop => ({
          ...shop,
          isInterested: interestedShopIds.includes(shop._id)
        }));
        this.setData({ shops });
      }
    } catch (err) {
      console.error('加载约饭意向失败:', err);
    }
  },

  // 切换约饭意向
  async onToggleInterest(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const { shop } = e.currentTarget.dataset;

    wx.showLoading({ title: '处理中...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'toggleDiningInterest',
        data: { shopId: shop._id }
      });

      if (result.success) {
        // 更新本地状态
        const shops = this.data.shops.map(item => {
          if (item._id === shop._id) {
            return {
              ...item,
              isInterested: result.isInterested
            };
          }
          return item;
        });
        this.setData({ shops });

        wx.showToast({
          title: result.message,
          icon: 'none'
        });
      } else {
        wx.showToast({ title: result.error || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('切换约饭意向失败:', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onShareAppMessage() {
    return {
      title: '新店探索 - 喵了个鱼',
      path: '/pages/food-discovery/food-discovery'
    };
  }
});
