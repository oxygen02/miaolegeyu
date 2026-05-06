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
    deadlineTimer: null,
    showPosterModal: false,
    posterData: null,
    posterTitle: '分享海报'
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
      let createdRooms = [];
      let participatedRooms = [];

      // 并行获取我创建的房间和我参与的房间
      const fetchCreated = async () => {
        try {
          const res = await wx.cloud.callFunction({
            name: 'getRoomsByCreator',
            data: { status: '' }
          });
          if (res.result.code === 0) {
            const creatorGroups = res.result.data || [];
            return this.flattenRooms(creatorGroups);
          }
        } catch (cloudErr) {
          console.log('获取创建的房间失败:', cloudErr);
        }
        return [];
      };

      const fetchParticipated = async () => {
        try {
          const res = await wx.cloud.callFunction({
            name: 'getMyParticipatedRooms',
            data: { status: '' }
          });
          if (res.result.code === 0) {
            return res.result.data || [];
          }
        } catch (cloudErr) {
          console.log('获取参与的房间失败:', cloudErr);
        }
        return [];
      };

      if (currentFilter === 'all') {
        // 全部：同时获取创建的和参与的
        [createdRooms, participatedRooms] = await Promise.all([fetchCreated(), fetchParticipated()]);
      } else if (currentFilter === 'created') {
        // 我创建的
        createdRooms = await fetchCreated();
      } else if (currentFilter === 'participated') {
        // 我参与的
        participatedRooms = await fetchParticipated();
      }

      // 合并并去重（根据 roomId）
      const roomMap = new Map();
      [...createdRooms, ...participatedRooms].forEach(room => {
        if (room.roomId && !roomMap.has(room.roomId)) {
          roomMap.set(room.roomId, room);
        }
      });
      let allRooms = Array.from(roomMap.values());
      
      // 调试日志
      if (allRooms.length > 0) {
        console.log('[room-list调试] 第一个房间数据:', JSON.stringify(allRooms[0]));
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
      this.setData({
        allRooms: [],
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
            creatorAvatarUrl: group.creatorAvatar,
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

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.loadData();
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
    wx.navigateTo({
      url: `/pages/vote/vote?roomId=${roomId}`
    });
  },

  // 点击卡片进入房间
  goToRoom(e) {
    const { roomid } = e.currentTarget.dataset;
    this.goToRoomById(roomid);
  },

  // 管理菜单相关方法
  onManageTap(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
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
    if (e.stopPropagation) {
      e.stopPropagation();
    }
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
  },

  // 查看海报
  async onViewPoster() {
    const roomId = this.data.selectedRoomId;
    const room = this.data.allRooms.find(r => r.roomId === roomId);
    this.onCloseActionSheet();

    if (!room) {
      wx.showToast({ title: '房间信息不存在', icon: 'none' });
      return;
    }

    // 生成小程序码
    let qrCodeUrl = '';
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${roomId}`,
          page: 'pages/vote/vote',
          width: 280
        }
      });
      if (result.code === 0 && result.data) {
        qrCodeUrl = result.data;
      }
    } catch (err) {
      console.error('[room-list] 生成小程序码失败:', err);
    }

    const winner = room.finalPoster || {};
    const isLocked = room.status === 'locked' || room.status === 'completed';

    // 组合时间显示：日期 + 时间
    let timeDisplay = '待定';
    console.log('[海报调试] room.activityDate:', room.activityDate, 'room.activityTime:', room.activityTime);
    if (room.activityDate && room.activityTime) {
      timeDisplay = room.activityDate + ' ' + room.activityTime;
    } else if (room.activityDate) {
      timeDisplay = room.activityDate;
    } else if (room.activityTime) {
      timeDisplay = room.activityTime;
    }
    console.log('[海报调试] timeDisplay:', timeDisplay);

    // 获取创建者头像（兼容两种字段名）
    const creatorAvatar = room.creatorAvatar || room.creatorAvatarUrl || '';
    console.log('[海报调试] creatorAvatar:', creatorAvatar);

    if (isLocked && winner.name) {
      // 显示结果海报
      const posterData = {
        type: 'result',
        mode: room.mode || 'a',
        winner: {
          name: winner.name || room.shopName || '饭店待定',
          image: winner.imageUrl || '',
          address: winner.address || room.location?.name || room.location || '',
          category: winner.category || '美食',
          price: winner.price || '',
          voteCount: room.totalVoters || 0,
          votePercent: winner.votePercent || 0
        },
        finalPoster: winner.imageUrl ? { imageUrl: winner.imageUrl } : null,
        roomTitle: room.title || '聚餐投票',
        roomTime: timeDisplay,
        roomAddress: room.location?.name || room.location || '',
        participants: room.participants || [],
        isAnonymous: room.isAnonymous || false,
        qrCodeUrl: qrCodeUrl,
        creatorAvatar: creatorAvatar
      };

      this.setData({
        posterData,
        posterTitle: '分享投票结果',
        showPosterModal: true
      });
    } else {
      // 显示邀请海报
      const posterData = {
        type: 'share',
        roomTitle: room.title || '聚餐投票',
        roomCode: room.roomId,
        roomPassword: room.password || '',
        needPassword: !!room.password,
        roomTime: timeDisplay,
        roomAddress: room.location?.name || room.location || '待定',
        qrCodeUrl: qrCodeUrl,
        creatorAvatar: creatorAvatar
      };

      this.setData({
        posterData,
        posterTitle: '邀请好友投票',
        showPosterModal: true
      });
    }
  },

  // 模拟结果海报（用于预览效果）
  async onMockResultPoster() {
    const mockPosterData = {
      type: 'result',
      mode: 'a',
      winner: {
        name: '海底捞火锅（春熙路店）',
        image: '',
        address: '春熙路东段168号',
        category: '火锅',
        price: '¥120/人',
        voteCount: 8,
        votePercent: 72.7
      },
      finalPoster: null,
      roomTitle: '五一后小聚',
      roomTime: '2026-05-09 18:00',
      roomAddress: '石油苑附近',
      participants: [
        { nickName: '小明', avatarUrl: '' },
        { nickName: '小红', avatarUrl: '' },
        { nickName: '小李', avatarUrl: '' },
        { nickName: '小张', avatarUrl: '' },
        { nickName: '小王', avatarUrl: '' },
        { nickName: '小陈', avatarUrl: '' },
        { nickName: '小刘', avatarUrl: '' },
        { nickName: '小赵', avatarUrl: '' }
      ],
      isAnonymous: false,
      qrCodeUrl: '',
      creatorAvatar: ''
    };

    this.setData({
      posterData: mockPosterData,
      posterTitle: '分享投票结果',
      showPosterModal: true
    });
  },

  onPosterClose() {
    this.setData({
      showPosterModal: false,
      posterData: null
    });
  },

  onPosterSave(e) {
    console.log('[room-list] 海报已保存:', e.detail.imagePath);
  },

  onPosterShareFriend(e) {
    wx.showToast({
      title: '请点击右上角 ··· 分享',
      icon: 'none',
      duration: 2000
    });
  }
});
