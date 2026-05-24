const { imagePaths } = getApp().globalData;
const audioManager = getApp().globalData.audioManager;
const { withLock } = getApp().globalData.debounce;

// 敏感词库（与云函数保持一致）
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  // 其他违规
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

function containsSensitive(text) {
  if (!text) return false;
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) return true;
  }
  return false;
}

// 过滤违规活动
function filterSensitiveActivities(activities) {
  if (!activities || !Array.isArray(activities)) return [];
  return activities.filter(activity => {
    const textToCheck = [activity.title, activity.shopName, activity.location].filter(Boolean).join(' ');
    return !containsSensitive(textToCheck);
  });
}

Page({
  data: {
    imagePaths: imagePaths,
    activeTab: 'ongoing',
    ongoingCount: 0,
    myCount: 0,
    participatedCount: 0,
    showCreateModal: false,
    loading: false,
    viewMode: 'all', // 'all' | 'group' | 'dining'
    // 正在进行的活动
    ongoingActivities: [],
    // 我发起的活动
    myActivities: [],
    // 我参与的活动
    participatedActivities: [],
    // 历史参与
    historyActivities: [],
    // 编辑模式
    isEditMode: false,
    isAllSelected: false,
    selectedCount: 0,
    batchDeleteText: '删除',
    currentTab: 1,
    animatingTab: -1
  },

  onLoad(options) {
    
    // 设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8',
      animation: {
        duration: 0,
        timingFunc: 'linear'
      }
    });
    
    // 如果传入 tab=group，则显示拼单列表
    if (options.tab === 'group') {
      this.setData({ viewMode: 'group' });
    }
    
    // 清除旧缓存，确保不显示违规内容
    this.clearSensitiveCache();
    
    this.loadData();
    // 防抖：加入活动
    this._lockedJoinActivity = withLock(this.joinActivity.bind(this));
  },
  
  // 清除可能包含违规内容的缓存
  clearSensitiveCache() {
    try {
      const cacheKeys = ['fish_ongoing_all', 'fish_ongoing_group', 'fish_ongoing_dining', 'fish_ongoing_meal', 'fish_ongoing_scheduleVote'];
      cacheKeys.forEach(key => {
        try {
          wx.removeStorageSync(key);
          wx.removeStorageSync(key + '_time');
        } catch (e) {}
      });
      console.log('[fish-tank] 已清除活动列表缓存');
    } catch (e) {
      console.error('[fish-tank] 清除缓存失败:', e);
    }
  },

  onShow() {
    // 更新 tabBar 选中状态
    this.updateTabBarSelected();
    // 每次显示时刷新数据
    this.loadData();
    // 启动截止时间倒计时定时器
    this.startFishTankDeadlineTimer();
  },

  onHide() {
    this.clearFishTankDeadlineTimer();
  },

  // 下拉刷新
  async onPullDownRefresh() {
    wx.showNavigationBarLoading();
    await this.loadData();
    wx.hideNavigationBarLoading();
    wx.stopPullDownRefresh();
  },

  onUnload() {
    this.clearFishTankDeadlineTimer();
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 1 });
    }
  },

  switchBottomTab(e) {
    const { index } = e.currentTarget.dataset;
    const tabIndex = parseInt(index);

    this.setData({ animatingTab: tabIndex });

    setTimeout(() => {
      this.setData({ animatingTab: -1 });
    }, 500);

    const urlMap = {
      0: '/pages/index/index',
      1: '/pages/fish-tank/fish-tank',
      2: '/pages/profile/profile'
    };
    const url = urlMap[tabIndex];
    if (!url) return;

    if (tabIndex === 1) {
      return;
    }

    wx.switchTab({ url });
  },

  // 头像加载失败处理
  onAvatarError(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'header') {
      this.setData({
        'imagePaths.decorations.catAvatarIcon': '/assets/images/icons/juze_avatar.png'
      });
    }
  },

  // 加载所有数据
  async loadData() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadOngoingRooms(),
        this.loadMyRooms(),
        this.loadParticipatedRooms()
      ]);
      
      // 调试日志
    } finally {
      this.setData({ loading: false });
    }
  },

  // 格式化时间投票为统一活动格式
  formatScheduleVotes(votes) {
    return votes.map(vote => {
      const dates = vote.candidateDates || [];
      const dateStr = dates.length > 0
        ? dates.map(d => {
            const parts = d.split('-');
            return `${parts[1]}/${parts[2]}`;
          }).join('、')
        : '时间待定';

      // 提取第一个候选日期的月份和日期用于日历图标
      let calendarMonth = '投票';
      let calendarDay = '中';
      if (dates.length > 0) {
        const firstDate = dates[0].split('-');
        if (firstDate.length >= 3) {
          calendarMonth = `${parseInt(firstDate[1])}月`;
          calendarDay = `${parseInt(firstDate[2])}`;
        }
      }

      let timeStr = '时间待定';
      if (vote.deadline) {
        try {
          const d = new Date(vote.deadline);
          if (!isNaN(d.getTime())) {
            const m = (d.getMonth() + 1) + '月' + d.getDate() + '日';
            const h = d.getHours().toString().padStart(2, '0');
            const min = d.getMinutes().toString().padStart(2, '0');
            timeStr = `截止 ${m} ${h}:${min}`;
          }
        } catch (e) { /* ignore */ }
      }

      return {
        id: vote._id,
        type: 'scheduleVote',
        typeName: '时间投票',
        title: vote.title || '时间投票',
        shopName: dateStr,
        location: vote.location || '',
        time: timeStr,
        participantCount: vote.participantCount || 0,
        image: imagePaths.banners.taiyakiIcon,
        status: vote.isExpired ? 'ended' : 'voting',
        statusName: vote.isExpired ? '已截止' : '进行中',
        roomId: vote._id,
        isCreator: vote.isCreator,
        creatorNickName: vote.isCreator ? '我' : '发起人',
        creatorAvatarUrl: imagePaths.decorations.catAvatarIcon,
        isScheduleVote: true,
        calendarMonth,
        calendarDay
      };
    });
  },

  // 加载时间投票
  async loadScheduleVotes(mode) {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyScheduleVotes',
        data: { mode, limit: 100 }
      });
      if (result.success && result.votes) {
        return this.formatScheduleVotes(result.votes);
      }
      return [];
    } catch (err) {
      return [];
    }
  },

  // 加载正在进行的活动（所有进行中的）
  async loadOngoingRooms() {
    const viewMode = this.data.viewMode;
    const CACHE_KEY = `fish_ongoing_${viewMode}`;
    const CACHE_TIME = `fish_ongoing_${viewMode}_time`;
    const CACHE_EXPIRY = 3 * 60 * 1000; // 缓存3分钟

    // 1. 先显示缓存数据（如果有且未过期）
    try {
      const cached = wx.getStorageSync(CACHE_KEY);
      const cachedTime = wx.getStorageSync(CACHE_TIME);
      if (cached && cachedTime && (Date.now() - cachedTime < CACHE_EXPIRY)) {
        // 过滤缓存中的违规内容
        const filteredActivities = filterSensitiveActivities(cached.ongoingActivities);
        this.setData({
          ongoingActivities: filteredActivities,
          ongoingCount: filteredActivities.length
        });
      }
    } catch (e) { /* 忽略缓存读取错误 */ }

    // 2. 请求最新数据
    // 如果是约饭模式，调用不同的云函数
    if (viewMode === 'meal') {
      await this.loadDiningAppointments();
      return;
    }

    // 如果是时间投票模式
    if (viewMode === 'scheduleVote') {
      try {
        const votes = await this.loadScheduleVotes('all');
        const ongoingVotes = votes.filter(v => v.status === 'voting');
        // 过滤违规投票
        const filteredVotes = filterSensitiveActivities(ongoingVotes);
        const processed = this.processActivitiesDeadline(filteredVotes);
        this.setData({
          ongoingActivities: processed,
          ongoingCount: filteredVotes.length
        });
        wx.setStorageSync(CACHE_KEY, { ongoingActivities: processed, ongoingCount: filteredVotes.length });
        wx.setStorageSync(CACHE_TIME, Date.now());
      } catch (err) {
        // 缓存已显示，用户无感知
      }
      return;
    }

    try {
      // 如果是全部模式，同时查询 rooms 和 dining_appointments
      let allRooms = [];
      
      // 查询 rooms 集合（聚餐和拼单）
      const { result: roomsResult } = await wx.cloud.callFunction({
        name: 'getAllRooms',
        data: { 
          limit: 100,
          mode: viewMode === 'all' ? 'all' : viewMode
        }
      });

      if (roomsResult.success && roomsResult.rooms) {
        allRooms = [...roomsResult.rooms];
      }
      
      // 如果是全部模式，再查询 dining_appointments
      if (viewMode === 'all') {
        try {
          const { result: diningResult } = await wx.cloud.callFunction({
            name: 'getDiningAppointments',
            data: { limit: 100 }
          });
          
          if (diningResult.success && diningResult.appointments) {
            // 将约饭活动转换为统一格式
            const diningRooms = diningResult.appointments.map(apt => ({
              _id: apt._id,
              roomId: apt._id,
              title: apt.shopName || '约饭活动',
              status: 'voting',
              mode: 'meal',
              activityTime: apt.appointmentTime,
              deadline: apt.deadline,
              location: apt.shopName,
              shopName: apt.shopName,
              shopImage: '',
              participantCount: apt.participantCount || 0,
              creatorNickName: apt.initiatorName || '神秘喵友',
              creatorAvatarUrl: apt.initiatorAvatar || ''
            }));
            allRooms = [...allRooms, ...diningRooms];
          }
        } catch (diningErr) {
        }
      }

      // 如果是全部模式，混入时间投票
      if (viewMode === 'all') {
        try {
          const scheduleVotes = await this.loadScheduleVotes('all');
          const ongoingVotes = scheduleVotes.filter(v => v.status === 'voting');
          // 过滤违规投票
          const filteredVotes = filterSensitiveActivities(ongoingVotes);
          allRooms = [...allRooms, ...filteredVotes];
        } catch (svErr) {
        }
      }

      // 获取当前用户openid
      const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
      
      // 统计各类型数量
      const rooms = allRooms.map(room => {
        // 根据 mode 确定类型
        let type = 'dining';
        let typeName = '聚餐';
        if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚餐';
        }
        const isGroup = room.mode === 'group';
        const isMeal = room.mode === 'meal';
        // 确保 shopName 是字符串
        let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || room.shopName || '地点待定');
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（约饭显示报名截止，聚餐/拼单显示投票截止）
        let timeStr = room.deadline || room.voteDeadline || room.activityTime || '时间待定';
        if (timeStr && timeStr !== '时间待定') {
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              timeStr = `${month}月${day}日 ${hours}:${minutes}`;
            }
          } catch (e) {
          }
        }
        // 拼单显示平台信息
        let displayShopName = shopName;
        if (isGroup && room.platform) {
          const platformMap = {
            'meituan': '美团',
            'eleme': '饿了么',
            'taobao': '淘宝',
            'jd': '京东'
          };
          displayShopName = platformMap[room.platform] || room.platform;
        }
        // 判断是否是创建者
        const isCreator = room.creatorOpenId === myOpenId || room.isCreator === true;
        return {
          id: room.roomId,
          type: type,
          typeName: typeName,
          title: room.title,
          shopName: isMeal ? room.shopName : displayShopName,
          time: timeStr,
          participantCount: room.participantCount || 0,
          image: room.shopImage || (room.candidatePosters && room.candidatePosters[0] && room.candidatePosters[0].imageUrl) || imagePaths.banners.taiyakiIcon,
          status: room.status,
          statusName: room.status === 'voting' ? '进行中' : '已结束',
          roomId: room.roomId,
          platform: room.platform,
          minAmount: room.minAmount,
          currentAmount: room.currentAmount || 0,
          isCreator: isCreator,
          creatorOpenId: room.creatorOpenId,
          creatorNickName: room.creatorNickName || '未知用户',
          creatorAvatarUrl: room.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon,
          // 拼单参与者头像
          participantAvatars: room.participantAvatars || []
        };
      });

      const processed = this.processActivitiesDeadline(rooms);
      // 过滤违规内容
      const filteredProcessed = filterSensitiveActivities(processed);
      this.setData({
        ongoingActivities: filteredProcessed,
        ongoingCount: filteredProcessed.length
      });
      // 写入缓存（存储过滤后的数据）
      wx.setStorageSync(CACHE_KEY, { ongoingActivities: filteredProcessed, ongoingCount: filteredProcessed.length });
      wx.setStorageSync(CACHE_TIME, Date.now());
    } catch (err) {
      // 网络失败时，缓存数据已显示，用户无感知
      console.error('[fish-tank] loadOngoingRooms 失败:', err);
    }
  },

  // 加载约饭活动
  async loadDiningAppointments() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { limit: 100 }
      });

      // 获取当前用户openid
      const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
      
      if (result.success && result.appointments) {
        const appointments = result.appointments.map(apt => {
          // 格式化报名截止时间
          let timeStr = apt.deadline || '时间待定';
          if (timeStr !== '时间待定') {
            try {
              const d = new Date(timeStr);
              if (!isNaN(d.getTime())) {
                const m = (d.getMonth() + 1) + '月' + d.getDate() + '日';
                const h = d.getHours().toString().padStart(2, '0');
                const min = d.getMinutes().toString().padStart(2, '0');
                timeStr = m + ' ' + h + ':' + min;
              }
            } catch (e) { /* ignore */ }
          }
          // 判断是否是创建者
          const isCreator = apt.initiatorOpenId === myOpenId;
          return {
            id: apt.roomId,
            type: 'meal',
            typeName: '约饭',
            title: apt.title,
            shopName: apt.shopName,
            shopId: apt.shopId || '',
            time: timeStr,
            deadline: apt.deadline,
            participantCount: apt.participantCount || 0,
            image: apt.shopImage || imagePaths.banners.taiyakiIcon,
            status: 'voting',
            statusName: '进行中',
            roomId: apt.roomId,
            platform: '',
            minAmount: 0,
            currentAmount: 0,
            isCreator: isCreator,
            creatorOpenId: apt.initiatorOpenId,
            creatorNickName: apt.creatorNickName || '神秘喵友',
            creatorAvatarUrl: apt.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon,
            isAppointment: true
          };
        });

      // 过滤违规内容
      const filteredAppointments = filterSensitiveActivities(appointments);
      this.setData({
        ongoingActivities: this.processActivitiesDeadline(filteredAppointments),
        ongoingCount: filteredAppointments.length
      });
    } else {
      this.setData({
        ongoingActivities: [],
        ongoingCount: 0
      });
      }
    } catch (err) {
      this.setData({
        ongoingActivities: [],
        ongoingCount: 0
      });
    }
  },

  // 加载我发起的活动
  async loadMyRooms() {
    // 如果是约饭模式，查询 dining_appointments
    if (this.data.viewMode === 'meal') {
      await this.loadMyDiningAppointments();
      return;
    }

    // 如果是时间投票模式
    if (this.data.viewMode === 'scheduleVote') {
      const votes = await this.loadScheduleVotes('created');
      // 过滤违规投票
      const filteredVotes = filterSensitiveActivities(votes);
      this.setData({
        myActivities: this.processActivitiesDeadline(filteredVotes),
        myCount: filteredVotes.length
      });
      return;
    }

    try {
      let allMyRooms = [];
      
      // 查询 rooms 集合
      const { result } = await wx.cloud.callFunction({
        name: 'getMyRooms',
        data: {
          mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
        }
      });

      if (result.code === 0 && result.data) {
        allMyRooms = [...result.data];
      }
      
      // 如果是全部模式，再查询 dining_appointments
      if (this.data.viewMode === 'all') {
        try {
          const { result: diningResult } = await wx.cloud.callFunction({
            name: 'getMyDiningAppointments'
          });
          
          if (diningResult.success && diningResult.appointments) {
            const diningRooms = diningResult.appointments.map(apt => ({
              _id: apt._id,
              roomId: apt._id,
              title: apt.shopName || '约饭活动',
              status: 'voting',
              mode: 'meal',
              activityTime: apt.appointmentTime,
              deadline: apt.deadline,
              location: apt.shopName,
              shopName: apt.shopName,
              shopImage: '',
              participantCount: apt.participantCount || 0,
              creatorNickName: apt.initiatorName || '神秘喵友',
              creatorAvatarUrl: apt.initiatorAvatar || ''
            }));
            allMyRooms = [...allMyRooms, ...diningRooms];
          }
        } catch (diningErr) {
        }
      }

      // 如果是全部模式，混入时间投票
      if (this.data.viewMode === 'all') {
        try {
          const scheduleVotes = await this.loadScheduleVotes('created');
          // 过滤违规投票
          const filteredVotes = filterSensitiveActivities(scheduleVotes);
          allMyRooms = [...allMyRooms, ...filteredVotes];
        } catch (svErr) {
        }
      }

      
      const rooms = allMyRooms.map(room => {
        // 根据 mode 确定类型
        let type = 'dining';
        let typeName = '聚餐';
        if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚餐';
        }
        const isGroup = room.mode === 'group';
        const isMeal = room.mode === 'meal';
        // 确保 shopName 是字符串
        let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || room.shopName || '地点待定');
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（约饭显示报名截止，聚餐/拼单显示投票截止）
        let timeStr = room.voteDeadlineStr || room.deadline || room.activityTime || '时间待定';
        if (timeStr && timeStr !== '时间待定' && !room.voteDeadlineStr) {
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              timeStr = `${month}月${day}日 ${hours}:${minutes}`;
            }
          } catch (e) {
          }
        }
        return {
          id: room.roomId,
          type: type,
          typeName: typeName,
          title: room.title,
          shopName: isMeal ? room.shopName : shopName,
          time: timeStr,
          participantCount: room.participantCount || 0,
          image: room.shopImage || room.candidatePosters?.[0]?.imageUrl || imagePaths.banners.taiyakiIcon,
          status: room.status,
          statusName: room.status === 'voting' ? '进行中' : '已结束',
          roomId: room.roomId,
          platform: room.platform,
          minAmount: room.minAmount,
          currentAmount: room.currentAmount || 0,
          isCreator: true,
          creatorNickName: room.creatorNickName || '未知用户',
          creatorAvatarUrl: room.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon
        };
      });

      // 过滤违规内容
      const filteredRooms = filterSensitiveActivities(rooms);
      this.setData({
        myActivities: this.processActivitiesDeadline(filteredRooms),
        myCount: filteredRooms.length
      });
    } catch (err) {
      this.setData({
        myActivities: [],
        myCount: 0
      });
    }
  },

  // 加载我发起的约饭活动
  async loadMyDiningAppointments() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyDiningAppointments'
      });

      if (result.success && result.appointments) {
        const appointments = result.appointments.map(apt => {
          // 格式化报名截止时间
          let timeStr = apt.deadline || '时间待定';
          if (timeStr !== '时间待定') {
            try {
              const d = new Date(timeStr);
              if (!isNaN(d.getTime())) {
                const m = (d.getMonth() + 1) + '月' + d.getDate() + '日';
                const h = d.getHours().toString().padStart(2, '0');
                const min = d.getMinutes().toString().padStart(2, '0');
                timeStr = m + ' ' + h + ':' + min;
              }
            } catch (e) { /* ignore */ }
          }
          return {
            id: apt._id,
            type: 'meal',
            typeName: '约饭',
            title: apt.shopName || '约饭活动',
            shopName: apt.shopName || '未知店铺',
            shopId: apt.shopId || '',
            time: timeStr,
            deadline: apt.deadline,
            participantCount: apt.participantCount || 0,
            image: apt.shopImage || imagePaths.banners.taiyakiIcon,
            status: apt.status,
            statusName: '进行中',
            roomId: apt._id,
            isCreator: true,
            creatorNickName: apt.initiatorName || '神秘喵友',
            creatorAvatarUrl: apt.initiatorAvatar || imagePaths.decorations.catAvatarIcon
          };
        });

      // 过滤违规内容
      const filteredAppointments = filterSensitiveActivities(appointments);
      this.setData({
        myActivities: this.processActivitiesDeadline(filteredAppointments),
        myCount: filteredAppointments.length
      });
    } else {
      this.setData({
        myActivities: [],
        myCount: 0
      });
      }
    } catch (err) {
      this.setData({
        myActivities: [],
        myCount: 0
      });
    }
  },

  // 加载我参与的活动
  async loadParticipatedRooms() {
    // 如果是约饭模式，查询 dining_appointments 的参与者
    if (this.data.viewMode === 'meal') {
      await this.loadParticipatedDiningAppointments();
      return;
    }

    // 如果是时间投票模式
    if (this.data.viewMode === 'scheduleVote') {
      const votes = await this.loadScheduleVotes('participated');
      // 过滤违规投票
      const filteredVotes = filterSensitiveActivities(votes);
      this.setData({
        participatedActivities: this.processActivitiesDeadline(filteredVotes),
        participatedCount: filteredVotes.length
      });
      return;
    }

    try {
      let allParticipatedRooms = [];
      
      // 查询 rooms 集合
      const { result } = await wx.cloud.callFunction({
        name: 'getRecentRooms',
        data: {
          limit: 100,
          mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
        }
      });
      

      if (result.success && result.rooms) {
        // 根据 viewMode 过滤房间
        let filteredRooms = result.rooms;
        if (this.data.viewMode !== 'all') {
          filteredRooms = result.rooms.filter(room => {
            if (this.data.viewMode === 'group') return room.mode === 'group';
            if (this.data.viewMode === 'dining') return room.mode === 'pick_for_them' || room.mode === 'b';
            return true;
          });
        }
        allParticipatedRooms = [...filteredRooms];
      }
      
      // 如果是全部模式，再查询 dining_appointments
      if (this.data.viewMode === 'all') {
        try {
          const { result: diningResult } = await wx.cloud.callFunction({
            name: 'getDiningAppointments'
          });
          
          if (diningResult.success && diningResult.appointments) {
            const myOpenId = getApp().globalData.openid;
            // 过滤出我参与的（排除我发起的）
            const participated = diningResult.appointments.filter(apt => {
              return apt.participants && apt.participants.some(p => p.openId === myOpenId);
            });
            
            const diningRooms = participated.map(apt => ({
              _id: apt._id,
              roomId: apt._id,
              title: apt.shopName || '约饭活动',
              status: 'voting',
              mode: 'meal',
              activityTime: apt.appointmentTime,
              deadline: apt.deadline,
              location: apt.shopName,
              shopName: apt.shopName,
              shopImage: '',
              participantCount: apt.participantCount || 0,
              creatorNickName: apt.initiatorName || '神秘喵友',
              creatorAvatarUrl: apt.initiatorAvatar || ''
            }));
            allParticipatedRooms = [...allParticipatedRooms, ...diningRooms];
          }
        } catch (diningErr) {
        }
      }

      // 如果是全部模式，混入时间投票
      if (this.data.viewMode === 'all') {
        try {
          const scheduleVotes = await this.loadScheduleVotes('participated');
          // 过滤违规投票
          const filteredVotes = filterSensitiveActivities(scheduleVotes);
          allParticipatedRooms = [...allParticipatedRooms, ...filteredVotes];
        } catch (svErr) {
        }
      }


      const rooms = allParticipatedRooms.map(room => {
        // 根据 mode 确定类型
        let type = 'dining';
        let typeName = '聚餐';
        if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚餐';
        }
        const isGroup = room.mode === 'group';
        // 确保 shopName 是字符串
        let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || '地点待定');
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（约饭显示报名截止，聚餐/拼单显示投票截止）
        let timeStr = room.deadline || room.activityTime || '时间待定';
        if (timeStr && timeStr !== '时间待定') {
          try {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
              const month = date.getMonth() + 1;
              const day = date.getDate();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              timeStr = `${month}月${day}日 ${hours}:${minutes}`;
            }
          } catch (e) {
          }
        }
        return {
          id: room.roomId,
          type: type,
          typeName: typeName,
          title: room.title,
          shopName: shopName,
          time: timeStr,
          participantCount: room.participantCount || 0,
          image: room.shopImage || room.candidatePosters?.[0]?.imageUrl || imagePaths.banners.taiyakiIcon,
          status: room.status,
          statusName: room.status === 'voting' ? '进行中' : '已结束',
          roomId: room.roomId,
          platform: room.platform,
          minAmount: room.minAmount,
          currentAmount: room.currentAmount || 0,
          isCreator: false
        };
      });

      // 获取当前用户openid
      const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
      
      // 过滤违规内容并修正isCreator
      const filteredRooms = filterSensitiveActivities(rooms).map(room => ({
        ...room,
        isCreator: room.creatorOpenId === myOpenId
      }));
      this.setData({
        participatedActivities: this.processActivitiesDeadline(filteredRooms),
        participatedCount: filteredRooms.length
      });
    } catch (err) {
      this.setData({
        participatedActivities: [],
        participatedCount: 0
      });
    }
  },

  // 加载我参与的约饭活动
  async loadParticipatedDiningAppointments() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments'
      });

      // 获取当前用户openid
      const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
      
      if (result.success && result.appointments) {
        // 过滤出我参与的（排除我发起的）
        const participated = result.appointments.filter(apt => {
          // 检查 participants 数组中是否有我
          return apt.participants && apt.participants.some(p => p.openId === myOpenId);
        });

        const appointments = participated.map(apt => {
          // 格式化报名截止时间
          let timeStr = apt.deadline || '时间待定';
          if (timeStr !== '时间待定') {
            try {
              const d = new Date(timeStr);
              if (!isNaN(d.getTime())) {
                const m = (d.getMonth() + 1) + '月' + d.getDate() + '日';
                const h = d.getHours().toString().padStart(2, '0');
                const min = d.getMinutes().toString().padStart(2, '0');
                timeStr = m + ' ' + h + ':' + min;
              }
            } catch (e) { /* ignore */ }
          }
          return {
            id: apt._id,
            type: 'meal',
            typeName: '约饭',
            title: apt.shopName || '约饭活动',
            shopName: apt.shopName || '未知店铺',
            shopId: apt.shopId || '',
            time: timeStr,
            deadline: apt.deadline,
            participantCount: apt.participantCount || 0,
            image: apt.shopImage || imagePaths.banners.taiyakiIcon,
            status: apt.status,
            statusName: '进行中',
            roomId: apt._id,
            isCreator: false,
            creatorOpenId: apt.initiatorOpenId,
            creatorNickName: apt.initiatorName || '神秘喵友',
            creatorAvatarUrl: apt.initiatorAvatar || imagePaths.decorations.catAvatarIcon
          };
        });

      // 过滤违规内容并修正isCreator
      const filteredAppointments = filterSensitiveActivities(appointments).map(apt => ({
        ...apt,
        isCreator: apt.creatorOpenId === myOpenId
      }));
      this.setData({
        participatedActivities: this.processActivitiesDeadline(filteredAppointments),
        participatedCount: filteredAppointments.length
      });
    } else {
      this.setData({
        participatedActivities: [],
        participatedCount: 0
      });
      }
    } catch (err) {
      this.setData({
        participatedActivities: [],
        participatedCount: 0
      });
    }
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    audioManager.playBell();
    // 切换标签时退出编辑模式
    this.setData({
      activeTab: tab,
      isEditMode: false,
      isAllSelected: false,
      selectedCount: 0
    });
  },

  // 切换视图模式
  switchViewMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode }, () => {
      this.loadData();
    });
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

  // 右侧区域点击阻止冒泡
  onRightAreaTap() {
    // 阻止事件冒泡到 activity-main
  },

  // 预览图片
  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: [src],
      current: src
    });
  },

  // 图片加载失败处理
  onImageError(e) {
    const { index, type } = e.currentTarget.dataset;
    const listKey = type === 'ongoing' ? 'ongoingActivities' :
                    type === 'my' ? 'myActivities' :
                    type === 'participated' ? 'participatedActivities' : 'historyActivities';
    const list = this.data[listKey];
    const newList = [...list];
    if (newList[index]) {
      newList[index].image = imagePaths.banners.taiyakiIcon;
      this.setData({ [listKey]: newList });
    }
  },

  // 参与活动（拼单/约饭/时间投票）
  async joinActivity(e) {
    const roomId = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;

    if (type === 'group') {
      // 拼单活动 - 显示确认弹窗
      wx.showModal({
        title: '确认参与',
        content: '确定要参与这个拼单吗？',
        success: (res) => {
          if (res.confirm) {
            // 直接参与，不跳转
            this.doJoinGroupOrder(roomId);
          }
        }
      });
    } else if (type === 'meal') {
      // 约饭活动 - 跳转到店铺详情页
      const activity = this.data.ongoingActivities.find(a => a.id === roomId) ||
                       this.data.myActivities.find(a => a.id === roomId) ||
                       this.data.participatedActivities.find(a => a.id === roomId);
      const shopId = activity?.shopId;
      if (shopId) {
        wx.navigateTo({
          url: `/package-shop/pages/shop-detail/shop-detail?id=${shopId}`
        });
      } else {
        wx.showToast({ title: '店铺信息缺失', icon: 'none' });
      }
    } else if (type === 'scheduleVote') {
      // 时间投票 - 跳转到填写页面
      const activity = this.data.ongoingActivities.find(a => a.id === roomId) ||
                       this.data.myActivities.find(a => a.id === roomId) ||
                       this.data.participatedActivities.find(a => a.id === roomId);
      wx.navigateTo({
        url: `/package-schedule/pages/schedule-vote/fill/fill?voteId=${roomId}&title=${encodeURIComponent(activity?.title || '')}`
      });
    } else {
      // 聚餐活动 - 跳转到投票页
      wx.navigateTo({
        url: `/package-vote/pages/vote/vote?roomId=${roomId}`
      });
    }
  },

  // 执行参与拼单
  async doJoinGroupOrder(roomId) {
    wx.showLoading({ title: '处理中...' });
    
    try {
      // 默认选择第一个选项
      const { result } = await wx.cloud.callFunction({
        name: 'joinGroupOrder',
        data: {
          roomId,
          selectedOptionIndex: 0
        }
      });

      if (result.code !== 0) {
        wx.showToast({
          title: result.msg || '参与失败',
          icon: 'none'
        });
        return;
      }

      wx.showToast({
        title: result.isUpdate ? '已更新选择' : '参与成功',
        icon: 'success'
      });

      // 刷新列表
      this.loadData();

    } catch (err) {
      wx.showToast({
        title: '网络异常，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 创建拼单
  createGroupOrder(e) {
    const type = e.currentTarget.dataset.type;
    this.closeCreateModal();
    wx.navigateTo({
      url: `/package-create/pages/create-group-order/create-group-order?type=${type}`
    });
  },

  // 创建聚餐
  createDining() {
    this.closeCreateModal();
    wx.navigateTo({
      url: '/package-create/pages/create/create'
    });
  },

  // 跳转到活动详情
  goToActivityDetail(e) {
    const roomId = e.currentTarget.dataset.id;
    const activity = this.data.ongoingActivities.find(a => a.id === roomId) || 
                     this.data.myActivities.find(a => a.id === roomId) ||
                     this.data.participatedActivities.find(a => a.id === roomId);

    if (!roomId) {
      wx.showToast({ title: '房间ID无效', icon: 'none' });
      return;
    }

    // 根据活动类型跳转到不同页面
    if (activity?.type === 'scheduleVote') {
      // 时间投票 - 跳转到结果页（使用voteId参数）
      wx.navigateTo({
        url: `/package-schedule/pages/schedule-vote/result/result?voteId=${roomId}`,
        fail: (err) => {
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else if (activity?.type === 'group') {
      // 拼单活动 - 跳转到拼单详情页
      wx.navigateTo({
        url: `/package-vote/pages/group-detail/group-detail?roomId=${roomId}`,
        fail: (err) => {
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else if (activity?.type === 'meal') {
      // 约饭活动 - 跳转到店铺详情页
      const shopId = activity?.shopId;
      if (shopId) {
        wx.navigateTo({
          url: `/package-shop/pages/shop-detail/shop-detail?id=${shopId}`,
          fail: (err) => {
            wx.showToast({ title: '页面跳转失败', icon: 'none' });
          }
        });
      } else {
        wx.showToast({ title: '店铺信息缺失', icon: 'none' });
      }
    } else {
      // 聚餐投票活动
      wx.navigateTo({
        url: `/package-vote/pages/vote/vote?roomId=${roomId}`,
        fail: (err) => {
          wx.showToast({ title: '跳转失败', icon: 'none' });
        }
      });
    }
  },

  // 跳转到管理页面（发起人控制台）
  goToManage(e) {
    const roomId = e.currentTarget.dataset.id;
    const activity = this.data.myActivities.find(a => a.id === roomId);
    
    if (!roomId) return;
    
    // 拼单活动跳转到拼单管理页面
    if (activity?.type === 'group') {
      wx.navigateTo({
        url: `/package-vote/pages/roomConsole/console?roomId=${roomId}`
      });
    } else {
      // 聚餐活动跳转到control页面
      wx.navigateTo({
        url: `/package-vote/pages/control/control?roomId=${roomId}`
      });
    }
  },

  // 退出活动
  quitActivity(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认退出',
      content: '确定要退出这个活动吗？',
      confirmColor: '#FF4757',
      success: (res) => {
        if (res.confirm) {
          this.doQuitActivity(id);
        }
      }
    });
  },

  // 执行退出
  async doQuitActivity(roomId) {
    try {
      wx.showLoading({ title: '退出中' });
      
      const { result } = await wx.cloud.callFunction({
        name: 'quitRoom',
        data: { roomId }
      });

      if (result.code === 0) {
        wx.showToast({ title: '已退出', icon: 'success' });
        // 刷新数据
        this.loadData();
      } else {
        throw new Error(result.msg || '退出失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '退出失败', icon: 'none' });
    }
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

  // 跳转到新店探索
  goToFoodDiscovery() {
    wx.navigateTo({
      url: '/package-shop/pages/food-discovery/food-discovery'
    });
  },

  onShareAppMessage() {
    return {
      title: '来喵不喵一起拼单',
      path: '/pages/fish-tank/fish-tank'
    };
  },

  // ========== 批量操作功能 ==========
  
  // 切换编辑模式
  toggleEditMode() {
    const { isEditMode, activeTab } = this.data;
    const newEditMode = !isEditMode;

    // 播放音效
    if (newEditMode) {
      audioManager.playMeowShort();
    } else {
      audioManager.playPawTap();
    }
    
    // 确定当前列表的key
    const listKey = activeTab === 'ongoing' ? 'ongoingActivities' : 
                    activeTab === 'my' ? 'myActivities' : 
                    activeTab === 'participated' ? 'participatedActivities' : 'historyActivities';
    const list = this.data[listKey];
    
    // 清除所有选中状态
    const newList = list.map(item => ({ ...item, selected: false }));
    
    // 确定批量删除按钮文字
    let deleteText = '删除';
    if (activeTab === 'ongoing') {
      // 正在进行标签页：根据选中项判断是否全是自己创建的
      deleteText = '退出/删除';
    } else if (activeTab === 'participated') {
      deleteText = '退出';
    }
    
    this.setData({
      isEditMode: newEditMode,
      [listKey]: newList,
      isAllSelected: false,
      selectedCount: 0,
      batchDeleteText: deleteText
    });
  },

  // 切换选中状态
  toggleSelect(e) {
    const { index, type } = e.currentTarget.dataset;
    const listKey = type === 'ongoing' ? 'ongoingActivities' : 
                    type === 'my' ? 'myActivities' : 
                    type === 'participated' ? 'participatedActivities' : 'historyActivities';
    const list = this.data[listKey];
    
    const newList = [...list];
    newList[index].selected = !newList[index].selected;
    
    const selectedCount = newList.filter(item => item.selected).length;
    const isAllSelected = selectedCount === newList.length && newList.length > 0;
    
    // 更新批量删除按钮文字
    let deleteText = '删除';
    if (type === 'ongoing' || type === 'participated') {
      const selectedItems = newList.filter(item => item.selected);
      const hasCreatorItem = selectedItems.some(item => item.isCreator);
      const hasParticipantItem = selectedItems.some(item => !item.isCreator);
      
      if (hasCreatorItem && hasParticipantItem) {
        deleteText = '退出/删除';
      } else if (hasCreatorItem) {
        deleteText = '删除';
      } else if (hasParticipantItem) {
        deleteText = '退出';
      }
    }
    
    this.setData({
      [listKey]: newList,
      selectedCount,
      isAllSelected,
      batchDeleteText: deleteText
    });
  },

  // 全选/取消全选
  selectAll() {
    const { isAllSelected, activeTab } = this.data;
    const listKey = activeTab === 'ongoing' ? 'ongoingActivities' : 
                    activeTab === 'my' ? 'myActivities' : 
                    activeTab === 'participated' ? 'participatedActivities' : 'historyActivities';
    const list = this.data[listKey];
    
    const newSelectAll = !isAllSelected;
    const newList = list.map(item => ({ ...item, selected: newSelectAll }));
    const selectedCount = newSelectAll ? newList.length : 0;
    
    // 更新批量删除按钮文字
    let deleteText = '删除';
    if (activeTab === 'ongoing' || activeTab === 'participated') {
      const hasCreatorItem = newList.some(item => item.isCreator);
      const hasParticipantItem = newList.some(item => !item.isCreator);
      
      if (hasCreatorItem && hasParticipantItem) {
        deleteText = '退出/删除';
      } else if (hasCreatorItem) {
        deleteText = '删除';
      } else if (hasParticipantItem) {
        deleteText = '退出';
      }
    }
    
    this.setData({
      [listKey]: newList,
      isAllSelected: newSelectAll,
      selectedCount,
      batchDeleteText: deleteText
    });
  },

  // 批量删除
  async batchDelete() {
    const { selectedCount, activeTab } = this.data;

    if (selectedCount === 0) {
      wx.showToast({ title: '请先选择要删除的项目', icon: 'none' });
      return;
    }

    audioManager.playPurrShort();
    
    const listKey = activeTab === 'ongoing' ? 'ongoingActivities' : 
                    activeTab === 'my' ? 'myActivities' : 
                    activeTab === 'participated' ? 'participatedActivities' : 'historyActivities';
    const list = this.data[listKey];
    const selectedItems = list.filter(item => item.selected);
    
    // 统计删除和退出的数量
    const deleteCount = selectedItems.filter(item => item.isCreator).length;
    const quitCount = selectedItems.filter(item => !item.isCreator).length;
    
    let confirmText = '';
    if (deleteCount > 0 && quitCount > 0) {
      confirmText = `确定要删除 ${deleteCount} 个并退出 ${quitCount} 个活动吗？`;
    } else if (deleteCount > 0) {
      confirmText = `确定要删除这 ${deleteCount} 个活动吗？`;
    } else {
      confirmText = `确定要退出这 ${quitCount} 个活动吗？`;
    }
    
    const res = await wx.showModal({
      title: '确认操作',
      content: confirmText,
      confirmText: '确定',
      cancelText: '取消',
      confirmColor: '#FF6B6B'
    });
    
    if (!res.confirm) return;
    
    wx.showLoading({ title: '处理中...' });
    
    try {
      // 依次处理选中的项目
      let successCount = 0;
      let failCount = 0;
      
      for (const item of selectedItems) {
        try {
          
          // 检查 ID 是否为空
          const itemId = item.id || item.roomId;
          if (!itemId) {
            failCount++;
            continue;
          }
          
          if (item.isCreator) {
            // 删除自己创建的活动
            let result;
            // 判断是否是约饭活动：type === 'meal' 或 mode === 'meal' 或 isAppointment === true
            const isMealActivity = item.type === 'meal' || item.mode === 'meal' || item.isAppointment === true;
            if (isMealActivity) {
              // 约饭活动使用 deleteDiningAppointment
              const { result: deleteResult } = await wx.cloud.callFunction({
                name: 'deleteDiningAppointment',
                data: { appointmentId: item.id || item.roomId }
              });
              result = deleteResult;
            } else {
              // 其他活动使用 deleteRoom
              const { result: deleteResult } = await wx.cloud.callFunction({
                name: 'deleteRoom',
                data: { roomId: item.id || item.roomId }
              });
              result = deleteResult;
            }
            if (result.code === 0) {
              successCount++;
            } else {
              failCount++;
            }
          } else {
            // 退出参与的活动
            const { result } = await wx.cloud.callFunction({
              name: 'quitRoom',
              data: { roomId: item.id }
            });
            if (result.code === 0) {
              successCount++;
            } else {
              failCount++;
            }
          }
        } catch (itemErr) {
          failCount++;
        }
      }
      
      wx.hideLoading();
      
      if (failCount > 0) {
        wx.showToast({ title: `成功${successCount}个，失败${failCount}个`, icon: 'none' });
      } else {
        wx.showToast({ title: '操作成功', icon: 'success' });
      }
      
      // 退出编辑模式并刷新数据
      this.setData({ isEditMode: false });
      await this.loadData();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // 卡片点击事件
  onCardTap(e) {
    const { id, index, type } = e.currentTarget.dataset;
    const { isEditMode } = this.data;
    
    if (!isEditMode) {
      // 非编辑模式下，进入详情页
      this.goToActivityDetail({ currentTarget: { dataset: { id } } });
    } else {
      // 编辑模式下，切换选中状态
      this.toggleSelect({ currentTarget: { dataset: { index, type } } });
    }
  },

  // 计算截止时间紧急状态（≤1小时返回红色标记和倒计时文字）
  calcDeadlineUrgent(voteDeadline) {
    const now = Date.now();
    const ONE_HOUR = 3600000;
    let deadlineUrgent = false;
    let deadlineCountdown = '';

    if (voteDeadline) {
      try {
        const deadline = new Date(voteDeadline).getTime();
        if (!isNaN(deadline)) {
          const diff = deadline - now;
          if (diff > 0 && diff <= ONE_HOUR) {
            deadlineUrgent = true;
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

    return { deadlineUrgent, deadlineCountdown };
  },

  // 为活动列表批量添加截止时间紧急状态
  processActivitiesDeadline(activities) {
    return activities.map(item => ({
      ...item,
      ...this.calcDeadlineUrgent(item.voteDeadline || item.deadline)
    }));
  },

  // 启动 fish-tank 页面的截止时间倒计时定时器
  startFishTankDeadlineTimer() {
    this.clearFishTankDeadlineTimer();
    this._fishTankDeadlineTimer = setInterval(() => {
      const lists = ['ongoingActivities', 'myActivities', 'participatedActivities'];
      lists.forEach(listKey => {
        const listData = this.data[listKey];
        if (listData && listData.length > 0) {
          const updatedList = this.processActivitiesDeadline(listData);
          this.setData({ [listKey]: updatedList });
        }
      });
    }, 60000); // 每分钟更新一次
  },

  clearFishTankDeadlineTimer() {
    if (this._fishTankDeadlineTimer) {
      clearInterval(this._fishTankDeadlineTimer);
      this._fishTankDeadlineTimer = null;
    }
  },

  // 打开地图导航
  openMap(e) {
    const address = e.currentTarget.dataset.address;
    if (!address) return;
    
    wx.openLocation({
      name: address,
      address: address,
      success: () => {
        audioManager.playMeowShort();
      },
      fail: () => {
        wx.showToast({ title: '无法打开地图', icon: 'none' });
      }
    });
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    e.stopPropagation();
  },

  // 删除单个活动（管理员功能）
  deleteRoom(e) {
    const { id, title } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除活动「${title || id}」吗？此操作不可恢复！`,
      confirmColor: '#FF6B6B',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          // 调用云函数删除活动
          wx.cloud.callFunction({
            name: 'deleteRoomById',
            data: { roomId: id }
          }).then(res => {
            wx.hideLoading();
            const result = res.result;
            
            if (result.code === 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              // 刷新列表
              this.loadData();
            } else {
              wx.showToast({
                title: result.msg || '删除失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('删除活动失败:', err);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          });
        }
      }
    });
  }
});
