const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

Page({
  data: {
    imagePaths: imagePaths,
    allRooms: [],
    currentFilter: 'all',
    loading: true,
    cardColors: ['orange', 'green', 'blue', 'purple', 'pink'],
    inputRoomId: '',
    inputFocused: false,
    showActionSheet: false,
    selectedRoomId: null,
    deadlineTimer: null
  },

  onLoad() {
    // 设置导航栏颜色为米色
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8'
    });
    // 加载云存储图片 URL
    this.loadCloudImageUrls();
    this.loadData();
  },

  // 获取云存储图片的临时访问 URL
  async loadCloudImageUrls() {
    try {
      const cloudPaths = [];
      const pathMap = {};

      // 收集 icons 路径
      Object.keys(imagePaths.icons).forEach(key => {
        const path = imagePaths.icons[key];
        if (path && path.startsWith('cloud://')) {
          cloudPaths.push(path);
          pathMap[path] = { category: 'icons', key };
        }
      });

      if (cloudPaths.length === 0) return;

      const { result } = await wx.cloud.callFunction({
        name: 'getTempFileURL',
        data: { fileList: cloudPaths }
      });

      if (result && result.fileList) {
        const newImagePaths = { ...this.data.imagePaths };
        result.fileList.forEach(item => {
          const mapping = pathMap[item.fileID];
          if (mapping && item.tempFileURL) {
            newImagePaths[mapping.category][mapping.key] = item.tempFileURL;
          }
        });
        this.setData({ imagePaths: newImagePaths });
      }
    } catch (err) {
      console.error('获取云存储图片 URL 失败:', err);
    }
  },

  onShow() {
    this.loadData();
  },

  onHide() {
    this.clearDeadlineTimer();
  },

  onUnload() {
    this.clearDeadlineTimer();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const { currentFilter } = this.data;
      let allRooms = [];

      // 根据筛选类型调用不同的云函数
      if (currentFilter === 'participated') {
        // 获取我参与的房间
        try {
          const res = await wx.cloud.callFunction({
            name: 'getMyParticipatedRooms',
            data: { status: '' }
          });

          if (res.result.code === 0) {
            allRooms = res.result.data || [];
          }
        } catch (cloudErr) {
          console.log('获取参与的房间失败:', cloudErr);
        }
      } else {
        // 获取我创建的房间
        const mockData = this.getMockData();
        try {
          const res = await wx.cloud.callFunction({
            name: 'getRoomsByCreator',
            data: { status: currentFilter === 'all' || currentFilter === 'created' ? '' : currentFilter }
          });

          if (res.result.code === 0) {
            const creatorGroups = res.result.data || [];
            allRooms = this.flattenRooms(creatorGroups);
          }
        } catch (cloudErr) {
          console.log('云函数加载失败，使用模拟数据:', cloudErr);
        }

        // 合并模拟数据
        if (currentFilter === 'all' || currentFilter === 'created') {
          allRooms = [...mockData, ...allRooms];
        }
      }

      // 根据筛选条件过滤
      const filteredRooms = this.filterRooms(allRooms, currentFilter);

      // 计算截止时间紧急状态和倒计时
      const roomsWithDeadline = this.processDeadlines(filteredRooms);

      this.setData({
        allRooms: roomsWithDeadline,
        loading: false
      });

      // 启动倒计时定时器（每60秒更新一次）
      this.startDeadlineTimer();

    } catch (err) {
      console.error('加载失败:', err);
      const mockData = this.getMockData();
      const roomsWithDeadline = this.processDeadlines(mockData);
      this.setData({
        allRooms: roomsWithDeadline,
        loading: false
      });
      this.startDeadlineTimer();
    }
  },

  // 处理房间列表的截止时间：计算紧急状态和倒计时文字
  processDeadlines(rooms) {
    const now = Date.now();
    const ONE_HOUR = 3600000;

    return rooms.map(room => {
      let deadlineUrgent = false;
      let deadlineCountdown = '';

      if (room.voteDeadline) {
        try {
          const deadline = new Date(room.voteDeadline).getTime();
          if (!isNaN(deadline)) {
            const diff = deadline - now;
            if (diff > 0 && diff <= ONE_HOUR) {
              deadlineUrgent = true;
              // 格式化剩余时间
              const minutes = Math.ceil(diff / 60000);
              if (minutes >= 60) {
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                deadlineCountdown = `剩${h}时${m}分`;
              } else {
                deadlineCountdown = `剩${minutes}分`;
              }
            } else if (diff <= 0) {
              deadlineUrgent = true;
              deadlineCountdown = '已截止';
            }
          }
        } catch (e) {
          // 解析失败忽略
        }
      }

      return {
        ...room,
        deadlineUrgent,
        deadlineCountdown
      };
    });
  },

  // 启动截止时间倒计时定时器
  startDeadlineTimer() {
    this.clearDeadlineTimer();
    this.deadlineTimer = setInterval(() => {
      const { allRooms } = this.data;
      if (allRooms && allRooms.length > 0) {
        const roomsWithDeadline = this.processDeadlines(allRooms);
        this.setData({ allRooms: roomsWithDeadline });
      }
    }, 60000); // 每分钟更新一次
  },

  // 清除定时器
  clearDeadlineTimer() {
    if (this.deadlineTimer) {
      clearInterval(this.deadlineTimer);
      this.deadlineTimer = null;
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
    if (filter === 'all' || filter === 'created' || filter === 'participated') {
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

    // 使用在线图片作为默认图片（确保图片可以正常显示）
    const defaultPoster = 'https://picsum.photos/400/300?random=1';
    const defaultAvatar = 'https://picsum.photos/100/100?random=avatar';

    return [
      {
        roomId: '284756',
        title: '周五聚餐 - 选饭店',
        mode: 'a',
        status: 'voting',
        activityDate: tomorrowData.date,
        activityTime: tomorrowData.time,
        location: '西单大悦城',
        finalPoster: defaultPoster,
        candidatePosters: [
          { imageUrl: 'https://picsum.photos/400/300?random=2', shopName: '海底捞火锅' },
          { imageUrl: 'https://picsum.photos/400/300?random=3', shopName: '西贝莜面村' }
        ],
        creatorName: '吃货小王',
        creatorAvatar: 'https://picsum.photos/100/100?random=1',
        creatorId: 'mock-creator-001',
        participantCount: 3,
        participantAvatars: [
          { avatarUrl: 'https://picsum.photos/100/100?random=a1' },
          { avatarUrl: 'https://picsum.photos/100/100?random=a2' },
          { avatarUrl: 'https://picsum.photos/100/100?random=a3' }
        ]
      },
      {
        roomId: '192837',
        title: '周末约饭 - 选偏好',
        mode: 'b',
        status: 'voting',
        activityDate: dayAfterData.date,
        activityTime: dayAfterData.time,
        location: '朝阳大悦城',
        finalPoster: 'https://picsum.photos/400/300?random=4',
        candidatePosters: [
          { imageUrl: 'https://picsum.photos/400/300?random=5', shopName: '美食广场' }
        ],
        creatorName: '吃货小王',
        creatorAvatar: 'https://picsum.photos/100/100?random=2',
        creatorId: 'mock-creator-001',
        participantCount: 0,
        participantAvatars: []
      },
      {
        roomId: '563421',
        title: '部门团建聚餐',
        mode: 'a',
        status: 'voting',
        activityDate: dayAfterData.date,
        activityTime: '19:00',
        location: '朝阳大悦城',
        finalPoster: 'https://picsum.photos/400/300?random=6',
        candidatePosters: [
          { imageUrl: 'https://picsum.photos/400/300?random=7', shopName: '西贝莜面村' },
          { imageUrl: 'https://picsum.photos/400/300?random=8', shopName: '海底捞火锅' }
        ],
        creatorName: '美食家小李',
        creatorAvatar: 'https://picsum.photos/100/100?random=3',
        creatorId: 'mock-creator-002',
        participantCount: 5,
        participantAvatars: [
          { avatarUrl: 'https://picsum.photos/100/100?random=b1' },
          { avatarUrl: 'https://picsum.photos/100/100?random=b2' },
          { avatarUrl: 'https://picsum.photos/100/100?random=b3' },
          { avatarUrl: 'https://picsum.photos/100/100?random=b4' },
          { avatarUrl: 'https://picsum.photos/100/100?random=b5' }
        ]
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
    audioManager.playMeowShort();
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
  },

  // 管理菜单相关方法
  onManageTap(e) {
    e.stopPropagation();
    const { roomid } = e.currentTarget.dataset;
    this.setData({
      showActionSheet: true,
      selectedRoomId: roomid
    });
  },

  onCloseActionSheet() {
    this.setData({
      showActionSheet: false,
      selectedRoomId: null
    });
  },

  onActionSheetTap(e) {
    e.stopPropagation();
  },

  onShare() {
    const roomId = this.data.selectedRoomId;
    this.onCloseActionSheet();
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  onDelete() {
    const roomId = this.data.selectedRoomId;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，是否继续？',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          const allRooms = this.data.allRooms.filter(item => item.roomId !== roomId);
          this.setData({ allRooms });
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
        this.onCloseActionSheet();
      }
    });
  }
});
