Page({
  data: {
    allRooms: [],
    currentFilter: 'all',
    loading: true,
    cardColors: ['orange', 'green', 'blue', 'purple', 'pink'],
    inputRoomId: '',
    inputFocused: false
  },

  onLoad() {
    // 设置导航栏颜色为米色
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8'
    });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    
    try {
      // 先加载模拟数据
      const mockData = this.getMockData();
      
      // 尝试从云函数获取真实数据
      let allRooms = [];
      try {
        const res = await wx.cloud.callFunction({
          name: 'getRoomsByCreator',
          data: { status: this.data.currentFilter === 'all' ? '' : this.data.currentFilter }
        });
        
        if (res.result.code === 0) {
          // 将分组数据扁平化为房间列表
          const creatorGroups = res.result.data || [];
          allRooms = this.flattenRooms(creatorGroups);
        }
      } catch (cloudErr) {
        console.log('云函数加载失败，使用模拟数据:', cloudErr);
      }
      
      // 合并模拟数据和真实数据
      const combinedRooms = [...mockData, ...allRooms];
      
      // 根据筛选条件过滤
      const filteredRooms = this.filterRooms(combinedRooms, this.data.currentFilter);
      
      this.setData({
        allRooms: filteredRooms,
        loading: false
      });
      
    } catch (err) {
      console.error('加载失败:', err);
      // 即使出错也显示模拟数据
      const mockData = this.getMockData();
      this.setData({
        allRooms: mockData,
        loading: false
      });
    }
  },

  // 将分组数据扁平化为房间列表
  flattenRooms(creatorGroups) {
    const rooms = [];
    creatorGroups.forEach(group => {
      if (group.rooms && group.rooms.length > 0) {
        group.rooms.forEach(room => {
          rooms.push({
            ...room,
            creatorName: group.creatorName,
            creatorAvatar: group.creatorAvatar,
            creatorId: group.creatorId
          });
        });
      }
    });
    return rooms;
  },

  // 根据筛选条件过滤房间
  filterRooms(rooms, filter) {
    if (filter === 'all') {
      return rooms;
    }
    return rooms.filter(room => {
      if (filter === 'active') {
        return room.status === 'voting';
      } else if (filter === 'locked') {
        return room.status === 'locked' || room.status === 'completed';
      }
      return true;
    });
  },

  // 获取模拟数据
  getMockData() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    const formatDateTime = (date) => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return {
        date: `${month}月${day}日`,
        time: `${hour}:${minute}`
      };
    };

    const tomorrowData = formatDateTime(tomorrow);
    const dayAfterData = formatDateTime(dayAfterTomorrow);

    return [
      {
        roomId: '284756',
        title: '周五聚餐 - 选饭店',
        mode: 'a',
        status: 'voting',
        activityDate: tomorrowData.date,
        activityTime: tomorrowData.time,
        location: '西单大悦城',
        finalPoster: '/assets/images/wotiaohaole1.png',
        candidatePosters: [
          { imageUrl: '/assets/images/wotiaohaole1.png', shopName: '海底捞火锅' },
          { imageUrl: '/assets/images/nimenlaiding2.png', shopName: '西贝莜面村' }
        ],
        creatorName: '吃货小王',
        creatorAvatar: '/assets/images/cat-avatar-icon.png',
        creatorId: 'mock-creator-001'
      },
      {
        roomId: '192837',
        title: '周末约饭 - 选偏好',
        mode: 'b',
        status: 'voting',
        activityDate: dayAfterData.date,
        activityTime: dayAfterData.time,
        location: '朝阳大悦城',
        finalPoster: '/assets/images/taiyaki-icon.png',
        candidatePosters: [
          { imageUrl: '/assets/images/taiyaki-icon.png', shopName: '美食广场' }
        ],
        creatorName: '吃货小王',
        creatorAvatar: '/assets/images/cat-avatar-icon.png',
        creatorId: 'mock-creator-001'
      },
      {
        roomId: '563421',
        title: '部门团建聚餐',
        mode: 'a',
        status: 'voting',
        activityDate: dayAfterData.date,
        activityTime: '19:00',
        location: '朝阳大悦城',
        finalPoster: '/assets/images/nimenlaiding2.png',
        candidatePosters: [
          { imageUrl: '/assets/images/nimenlaiding2.png', shopName: '西贝莜面村' },
          { imageUrl: '/assets/images/wotiaohaole1.png', shopName: '海底捞火锅' }
        ],
        creatorName: '美食家小李',
        creatorAvatar: '/assets/images/cat-avatar-icon.png',
        creatorId: 'mock-creator-002'
      }
    ];
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    
    // 重新过滤当前数据
    const allRooms = [...this.getMockData()]; // 简化处理，实际应该保留原始数据
    const filteredRooms = this.filterRooms(allRooms, filter);
    this.setData({ allRooms: filteredRooms });
  },

  // 房间号输入
  onRoomIdInput(e) {
    this.setData({ inputRoomId: e.detail.value });
  },

  // 输入框聚焦
  onInputFocus() {
    this.setData({ inputFocused: true });
  },

  // 输入框失焦
  onInputBlur() {
    this.setData({ inputFocused: false });
  },

  // 通过房间号进入
  enterRoomById() {
    const { inputRoomId } = this.data;
    if (!inputRoomId.trim()) {
      wx.showToast({
        title: '请输入房间号',
        icon: 'none'
      });
      return;
    }
    
    this.goToRoomById(inputRoomId.trim());
  },

  // 跳转到指定房间
  goToRoomById(roomId) {
    // 检查是否是模拟房间
    if (roomId.startsWith('mock-room-')) {
      const mode = roomId === 'mock-room-002' ? 'b' : 'a';
      wx.navigateTo({
        url: `/pages/vote/vote?roomId=${roomId}&mock=true&mode=${mode}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/vote/vote?roomId=${roomId}`
      });
    }
  },

  // 点击卡片进入房间
  goToRoom(e) {
    const { roomid } = e.currentTarget.dataset;
    this.goToRoomById(roomid);
  }
});
