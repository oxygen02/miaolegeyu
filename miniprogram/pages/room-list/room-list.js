const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');
const app = getApp();

Page({
  data: {
    imagePaths: {},
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

  async onLoad() {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
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
        }
        return [];
      };

      if (currentFilter === 'all' || currentFilter === 'active' || currentFilter === 'locked') {
        // 全部、进行中、已结束：同时获取创建的和参与的
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
            creatorId: group.creatorId,
            location: room.location && typeof room.location === 'object' ? room.location.name || room.location.address || '' : (room.location || ''),
            activityDate: room.activityDate && typeof room.activityDate === 'object' ? '' : (room.activityDate || ''),
            activityTime: room.activityTime && typeof room.activityTime === 'object' ? '' : (room.activityTime || '')
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

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    if (!src) return;

    wx.previewImage({
      current: src,
      urls: [src]
    });
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
    }

    const winner = room.finalPoster || {};
    const isLocked = room.status === 'locked' || room.status === 'completed';

    // 组合时间显示：日期 + 时间
    let timeDisplay = '待定';
    if (room.activityDate && room.activityTime) {
      timeDisplay = room.activityDate + ' ' + room.activityTime;
    } else if (room.activityDate) {
      timeDisplay = room.activityDate;
    } else if (room.activityTime) {
      timeDisplay = room.activityTime;
    }

    // 获取创建者头像（兼容两种字段名）
    const creatorAvatar = room.creatorAvatar || room.creatorAvatarUrl || '';

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
      // 投票进行中也显示结果海报样式（统一使用结果海报）
      const posterData = {
        type: 'result',
        mode: room.mode || 'a',
        winner: {
          name: room.title || '聚餐投票',
          image: '',
          address: room.location?.name || room.location || '待定',
          category: '美食',
          price: '',
          voteCount: room.totalVoters || 0,
          votePercent: 0
        },
        finalPoster: null,
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
    }
  },

  onPosterClose() {
    this.setData({
      showPosterModal: false,
      posterData: null
    });
  },

  onPosterSave(e) {
  },

  onPosterShareFriend(e) {
    wx.showToast({
      title: '请点击右上角 ··· 分享',
      icon: 'none',
      duration: 2000
    });
  }
});
