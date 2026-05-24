let app = null;
let audioManager = null;

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
    app = getApp();
    audioManager = app.globalData.audioManager;
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
      let scheduleVotes = [];

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

      // 获取时间投票（统一用 mode: 'all'，一次调用获取所有）
      const fetchScheduleVotes = async () => {
        try {
          const res = await wx.cloud.callFunction({
            name: 'getMyScheduleVotes',
            data: { mode: 'all', status: currentFilter, limit: 100 }
          });
          if (res.result && res.result.success) {
            return this.formatScheduleVotes(res.result.votes || []);
          }
        } catch (cloudErr) {
          console.log('[room-list] 获取时间投票失败:', cloudErr);
        }
        return [];
      };

      if (currentFilter === 'all' || currentFilter === 'active' || currentFilter === 'locked') {
        // 全部、进行中、已结束：获取普通投票和时间投票
        [createdRooms, participatedRooms, scheduleVotes] = await Promise.all([
          fetchCreated(), fetchParticipated(), fetchScheduleVotes()
        ]);
      } else if (currentFilter === 'created') {
        // 我创建的
        [createdRooms, scheduleVotes] = await Promise.all([fetchCreated(), fetchScheduleVotes()]);
      } else if (currentFilter === 'participated') {
        // 我参与的
        [participatedRooms, scheduleVotes] = await Promise.all([fetchParticipated(), fetchScheduleVotes()]);
      }

      // 合并并去重（根据 roomId）
      const roomMap = new Map();
      [...createdRooms, ...participatedRooms, ...scheduleVotes].forEach(room => {
        if (room.roomId && !roomMap.has(room.roomId)) {
          roomMap.set(room.roomId, room);
        }
      });
      let allRooms = Array.from(roomMap.values());

      // 按创建时间倒序排序（最新的排在最上面）
      allRooms.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      // 调试日志
      console.log('[room-list] 普通投票-创建:', createdRooms.length);
      console.log('[room-list] 普通投票-参与:', participatedRooms.length);
      console.log('[room-list] 时间投票:', scheduleVotes.length);
      console.log('[room-list] 合并后总数:', allRooms.length);
      console.log('[room-list] 时间投票详情:', scheduleVotes.map(v => ({ id: v.roomId, title: v.title, status: v.status })));

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

  // 格式化时间投票为统一房间格式
  formatScheduleVotes(votes) {
    return votes.map(vote => {
      const dates = vote.candidateDates || [];
      const dateStr = dates.length > 0
        ? dates.map(d => {
            const parts = d.split('-');
            return `${parts[1]}/${parts[2]}`;
          }).join('、')
        : '时间待定';

      let timeStr = '时间待定';
      if (vote.deadline) {
        try {
          const d = new Date(vote.deadline);
          if (!isNaN(d.getTime())) {
            const m = (d.getMonth() + 1) + '月' + d.getDate() + '日';
            const h = d.getHours().toString().padStart(2, '0');
            const min = d.getMinutes().toString().padStart(2, '0');
            timeStr = `${m} ${h}:${min}`;
          }
        } catch (e) { /* ignore */ }
      }

      const isExpired = vote.isExpired !== undefined ? vote.isExpired : this.isScheduleVoteExpired(vote);
      const isCreator = vote.isCreator;

      // 生成6位数字房间号用于显示（基于 _id 的哈希）
      const displayRoomId = this.generateShortRoomId(vote._id);

      return {
        roomId: vote._id,
        displayRoomId: displayRoomId,
        title: vote.title || '时间投票',
        status: isExpired ? 'locked' : 'voting',
        mode: 'scheduleVote',
        location: dateStr,
        activityTime: timeStr,
        voteDeadline: vote.deadline,
        participantCount: vote.participantCount || 0,
        creatorName: isCreator ? '我' : (vote.creatorNickName || '发起人'),
        creatorNickName: isCreator ? '我' : (vote.creatorNickName || '发起人'),
        creatorAvatarUrl: vote.creatorAvatarUrl || '',
        isScheduleVote: true,
        createdAt: vote.createdAt
      };
    });
  },

  // 根据 _id 生成稳定的6位数字房间号
  generateShortRoomId(id) {
    if (!id || id.length < 6) return '000000';
    // 取 _id 的字符进行简单哈希，生成6位数字
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & 0xFFFFFFFF;
    }
    const num = Math.abs(hash) % 1000000;
    return num.toString().padStart(6, '0');
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

  // 判断时间投票是否已结束
  isScheduleVoteExpired(vote) {
    if (!vote.deadline) return false;
    try {
      return new Date(vote.deadline).getTime() <= Date.now();
    } catch (e) {
      return false;
    }
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
      url: `/package-vote/pages/vote/vote?roomId=${roomId}`
    });
  },

  // 点击卡片进入房间
  goToRoom(e) {
    const { roomid } = e.currentTarget.dataset;
    const room = this.data.allRooms.find(r => r.roomId === roomid);
    
    // 如果是时间投票，跳转到时间投票页面
    if (room && room.isScheduleVote) {
      wx.navigateTo({
        url: `/package-schedule/pages/schedule-vote/result/result?voteId=${roomid}`
      });
      return;
    }
    
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
