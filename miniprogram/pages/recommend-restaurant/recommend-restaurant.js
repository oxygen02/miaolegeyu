const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
    roomId: '',
    room: {},
    voteStats: null,
    topMatches: [],
    restaurants: [],
    loading: true,
    // 腾讯地图SDK是否可用
    mapSdkReady: false
  },

  onLoad(options) {
    const { roomId, cuisineType } = options;
    this.setData({ roomId });
    this.initMapSdk();
    this.loadData();
  },

  // 初始化腾讯地图SDK
  initMapSdk() {
    try {
      // 使用微信小程序内置地图能力
      // 腾讯地图WebService API需要在云函数中调用（避免暴露key）
      this.setData({ mapSdkReady: true });
    } catch (err) {
      console.error('地图SDK初始化失败:', err);
      this.setData({ mapSdkReady: false });
    }
  },

  async loadData() {
    try {
      this.setData({ loading: true });

      // 获取房间信息
      const { result: roomResult } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });

      if (roomResult.code !== 0) {
        throw new Error(roomResult.msg);
      }

      const room = roomResult.data;

      // 获取投票统计
      let voteStats = null;
      if (room.mode === 'b') {
        const { result: statsResult } = await wx.cloud.callFunction({
          name: 'countVotes',
          data: { roomId: this.data.roomId }
        });
        if (statsResult.code === 0) {
          voteStats = statsResult.data;
        }
      }

      // 提取前3个最佳匹配
      const topMatches = voteStats?.bestMatches?.slice(0, 3) || [];

      this.setData({
        room,
        voteStats,
        topMatches
      });

      // 获取推荐餐厅（通过云函数调用腾讯地图API）
      await this.loadRestaurants(room, topMatches);

    } catch (err) {
      console.error('加载数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadRestaurants(room, topMatches) {
    try {
      // 获取位置信息
      const location = room.location;
      if (!location) {
        this.setData({ restaurants: [] });
        return;
      }

      // 构建搜索关键词（基于最佳匹配的口味）
      const keywords = topMatches.map(m => m.subCategoryName || m.categoryName).filter(Boolean);
      const searchKeyword = keywords.length > 0 ? keywords[0] : '美食';

      // 调用云函数搜索附近餐厅
      const restaurants = await this.searchNearbyRestaurants(location, searchKeyword);

      this.setData({ restaurants });
    } catch (err) {
      console.error('加载餐厅失败:', err);
      this.setData({ restaurants: [] });
    }
  },

  // 搜索附近餐厅（通过云函数调用腾讯地图API）
  async searchNearbyRestaurants(location, keyword) {
    try {
      // 调用云函数，在云函数中调用腾讯地图API（保护API Key）
      const { result } = await wx.cloud.callFunction({
        name: 'searchNearbyRestaurants',
        data: {
          location: location,
          keyword: keyword,
          radius: 5000,  // 搜索半径5公里
          pageSize: 20
        }
      });

      if (result.code === 0 && result.data && result.data.length > 0) {
        return result.data;
      }

      // 如果API调用失败，返回模拟数据
      console.log('腾讯地图API未返回数据，使用模拟数据');
      return this.generateMockRestaurants(location, keyword);
    } catch (err) {
      console.error('搜索餐厅失败:', err);
      return this.generateMockRestaurants(location, keyword);
    }
  },

  // 生成模拟餐厅数据（作为备用）
  generateMockRestaurants(location, keyword) {
    const mockData = [
      { name: '老成都火锅', rating: 4.8, avgPrice: 89, distance: 0.8, address: '附近建国路88号', phone: '010-12345678', cuisineType: '火锅' },
      { name: '湘味小厨', rating: 4.5, avgPrice: 65, distance: 1.2, address: '附近三里屯路12号', phone: '010-87654321', cuisineType: '湘菜' },
      { name: '日式料理屋', rating: 4.7, avgPrice: 128, distance: 0.5, address: '附近光华路66号', phone: '010-11223344', cuisineType: '日料' },
      { name: '烧烤大排档', rating: 4.3, avgPrice: 78, distance: 1.5, address: '附近工体北路20号', phone: '010-55667788', cuisineType: '烧烤' },
      { name: '粤式茶餐厅', rating: 4.6, avgPrice: 55, distance: 0.9, address: '附近朝阳门外大街3号', phone: '010-99887766', cuisineType: '粤菜' }
    ];

    // 根据关键词筛选相关餐厅
    const filtered = mockData.filter(r => {
      if (keyword.includes('火锅') || keyword.includes('川')) return r.cuisineType === '火锅' || r.cuisineType === '川菜';
      if (keyword.includes('湘')) return r.cuisineType === '湘菜';
      if (keyword.includes('粤')) return r.cuisineType === '粤菜';
      if (keyword.includes('日')) return r.cuisineType === '日料';
      if (keyword.includes('韩')) return r.cuisineType === '韩料';
      if (keyword.includes('烧烤') || keyword.includes('烤')) return r.cuisineType === '烧烤';
      if (keyword.includes('西')) return r.cuisineType === '西餐';
      return true;
    });

    return filtered.length >= 2 ? filtered : mockData.slice(0, 3);
  },

  // 点击餐厅卡片
  onRestaurantTap(e) {
    const { index } = e.currentTarget.dataset;
    const restaurant = this.data.restaurants[index];
    // 可以跳转到地图查看详情
    wx.showActionSheet({
      itemList: ['查看地图位置', '复制地址'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.openMapLocation(restaurant);
        } else if (res.tapIndex === 1) {
          wx.setClipboardData({
            data: `${restaurant.name} ${restaurant.address}`,
            success: () => wx.showToast({ title: '已复制', icon: 'success' })
          });
        }
      }
    });
  },

  // 导航到餐厅
  onNavigateTap(e) {
    const { index } = e.currentTarget.dataset;
    const restaurant = this.data.restaurants[index];
    
    if (!restaurant) {
      wx.showToast({ title: '暂无餐厅信息', icon: 'none' });
      return;
    }

    // 如果有经纬度，使用 openLocation
    if (restaurant.latitude && restaurant.longitude) {
      wx.openLocation({
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        name: restaurant.name || '目的地',
        address: restaurant.address || '',
        scale: 16,
        fail: (err) => {
          console.error('打开地图失败:', err);
          this.fallbackNavigate(restaurant);
        }
      });
    } else {
      this.fallbackNavigate(restaurant);
    }
  },

  // 备用导航方式
  fallbackNavigate(restaurant) {
    // 使用微信内置地图搜索
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          name: restaurant.name || '附近',
          address: restaurant.address || '',
          scale: 14
        });
      },
      fail: () => {
        wx.showToast({ title: '请授权位置权限', icon: 'none' });
      }
    });
  },

  // 拨打电话
  onCallTap(e) {
    const { phone } = e.currentTarget.dataset;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 打开地图搜索
  // 换一批餐厅
  refreshSearch() {
    this.setData({ loading: true });
    setTimeout(() => {
      // 随机打乱当前餐厅列表模拟刷新
      const restaurants = [...this.data.restaurants].sort(() => Math.random() - 0.5);
      this.setData({
        restaurants,
        loading: false
      });
      wx.showToast({ title: '已刷新推荐', icon: 'success' });
    }, 800);
  },

  openMapSearch() {
    const location = this.data.room.location;
    const keyword = this.data.topMatches[0]?.subCategoryName || '美食';

    // 使用微信内置地图搜索
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.openLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          name: keyword,
          address: location?.name || '附近',
          scale: 14
        });
      },
      fail: () => {
        wx.showToast({ title: '请授权位置权限', icon: 'none' });
      }
    });
  },

  // 打开地图位置
  openMapLocation(restaurant) {
    wx.showModal({
      title: restaurant.name,
      content: restaurant.address,
      confirmText: '导航',
      cancelText: '关闭',
      success: (res) => {
        if (res.confirm) {
          this.onNavigateTap({
            currentTarget: {
              dataset: { address: restaurant.address, name: restaurant.name }
            }
          });
        }
      }
    });
  }
});