const { imagePaths } = getApp().globalData;
const audioManager = getApp().globalData.audioManager;
const { withLock } = getApp().globalData.debounce;
const preloadManager = getApp().globalData.preloadManager;

// 统一的时间格式化函数
function formatDeadline(dateVal) {
  if (!dateVal) return '';
  let date;
  if (typeof dateVal === 'object' && dateVal.$date) {
    date = new Date(dateVal.$date);
  } else if (typeof dateVal === 'object' && dateVal._date) {
    date = new Date(dateVal._date);
  } else {
    date = new Date(dateVal);
  }
  if (isNaN(date.getTime())) return '';
  // 直接读取本地时间（北京时区），不加额外偏移
  const m = (date.getMonth() + 1) + '月' + date.getDate() + '日';
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m} ${h}:${min}`;
}

// formatDeadlineFull 是 formatDeadline 的别名（保持向后兼容）
const formatDeadlineFull = formatDeadline;

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
    animatingTab: -1,
    // 分享数据（用于约饭活动分享）
    shareData: null
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
    
    // 不再每次都清除缓存！只清除过期的违规缓存
    // this.clearSensitiveCache(); // 移除：避免每次进入都清缓存导致重新请求
    
    // 注册预加载器（供 app.js 后台调用）
    this._registerPreloaders();
    
    // 优先使用预加载数据秒开
    const preloaded = preloadManager.getCache('fish-tank');
    if (preloaded && preloaded.ongoingActivities) {
      const filtered = filterSensitiveActivities(preloaded.ongoingActivities);
      this.setData({
        ongoingActivities: filtered,
        ongoingCount: filtered.length
      });
      // 标记已消费，后台静默刷新
      preloadManager.consume('fish-tank');
    }
    
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
    // 通知预加载管理器用户有交互
    if (preloadManager) preloadManager.touch();
    
    // 智能刷新：只在数据为空或缓存过期时才重新加载
    // 避免每次切 tab 都全量请求（原逻辑每次 onShow 都 loadData）
    const hasData = this.data.ongoingActivities.length > 0 
      || this.data.myActivities.length > 0 
      || this.data.participatedActivities.length > 0;
    
    if (!hasData) {
      // 首次进入或数据被清空，需要加载
      this.loadData();
    } else {
      // 有旧数据时，后台静默刷新（不阻塞 UI）
      this._silentRefresh();
    }
    
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
          const formatted = formatDeadline(vote.deadline);
          if (formatted) timeStr = `截止 ${formatted}`;
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
        creatorNickName: vote.creatorNickName || (vote.participants && vote.participants[0] && vote.participants[0].isHost && vote.participants[0].nickName) || (vote.isCreator ? '我' : '发起人'),
        creatorAvatarUrl: vote.creatorAvatarUrl || (vote.participants && vote.participants[0] && vote.participants[0].isHost && vote.participants[0].avatarUrl) || imagePaths.decorations.catAvatarIcon,
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
      // 如果是全部模式，同时查询 rooms、dining_appointments、scheduleVotes（并行！）
      let allRooms = [];
      
      // 并行发起所有请求
      const [roomsResult, diningResult, scheduleVotesResult] = await Promise.allSettled([
        // 1. 查询 rooms 集合（聚餐和拼单）
        wx.cloud.callFunction({
          name: 'getAllRooms',
          data: { 
            limit: 100,
            mode: viewMode === 'all' ? 'all' : viewMode
          }
        }),
        // 2. 查询约饭活动（全部模式下）
        viewMode === 'all' 
          ? wx.cloud.callFunction({ name: 'getDiningAppointments', data: { limit: 100 } })
          : Promise.resolve({ result: { success: false } }),
        // 3. 查询时间投票（全部模式下）
        viewMode === 'all'
          ? this.loadScheduleVotes('all')
          : Promise.resolve([])
      ]);

      // 处理 rooms 结果
      if (roomsResult.status === 'fulfilled' && roomsResult.value.result?.success && roomsResult.value.result.rooms) {
        allRooms = [...roomsResult.value.result.rooms];
      }

      // 处理约饭结果
      if (diningResult.status === 'fulfilled' && diningResult.value.result?.success && diningResult.value.result.appointments) {
        const diningRooms = diningResult.value.result.appointments.map(apt => ({
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

      // 处理时间投票结果
      if (scheduleVotesResult.status === 'fulfilled' && Array.isArray(scheduleVotesResult.value)) {
        const ongoingVotes = scheduleVotesResult.value.filter(v => v.status === 'voting');
        const filteredVotes = filterSensitiveActivities(ongoingVotes);
        allRooms = [...allRooms, ...filteredVotes];
      }

      // 获取当前用户openid
      const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
      
      // 统计各类型数量
      const rooms = allRooms.map(room => {
        // 根据 mode 或 isScheduleVote 确定类型（时间投票优先判断）
        let type = 'dining';
        let typeName = '聚会';
        if (room.isScheduleVote || room.type === 'scheduleVote') {
          type = 'scheduleVote';
          typeName = '时间投票';
        } else if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚会';
        }
        const isScheduleVoteType = room.isScheduleVote || room.type === 'scheduleVote';
        const isGroup = room.mode === 'group';
        const isMeal = room.mode === 'meal';
        // 确保 shopName 是字符串（时间投票用 shopName 字段存储日期信息）
        let shopName = isScheduleVoteType ? (room.shopName || '') : (isGroup ? (room.shopName || '外卖拼单') : (room.location || room.shopName || '地点待定'));
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（约饭显示报名截止，聚餐/拼单显示投票截止）
        let timeStr = room.deadline || room.voteDeadline || room.activityTime || '时间待定';
        if (timeStr && timeStr !== '时间待定') {
          try {
            const formatted = formatDeadlineFull(timeStr);
            if (formatted) timeStr = formatted;
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
        // 获取发起人信息：优先从creatorNickName/creatorAvatarUrl获取，其次从participants中查找isHost=true的用户
        const getCreatorInfo = (room) => {
          if (room.creatorNickName && room.creatorAvatarUrl) {
            return {
              nickName: room.creatorNickName,
              avatarUrl: room.creatorAvatarUrl
            };
          }
          if (room.participants && Array.isArray(room.participants)) {
            const host = room.participants.find(p => p.isHost === true);
            if (host && host.nickName) {
              return {
                nickName: host.nickName,
                avatarUrl: host.avatarUrl || imagePaths.decorations.catAvatarIcon
              };
            }
          }
          // 如果都找不到，返回默认值
          return {
            nickName: '神秘喵友',
            avatarUrl: imagePaths.decorations.catAvatarIcon
          };
        };
        const creatorInfo = getCreatorInfo(room);
        return {
          id: room.roomId || room.id,
          type: type,
          typeName: typeName,
          title: room.title,
          shopName: isScheduleVoteType ? (room.shopName || '') : (isMeal ? room.shopName : displayShopName),
          time: isScheduleVoteType ? (room.time || timeStr) : timeStr,
          participantCount: room.participantCount || 0,
          image: isScheduleVoteType ? (imagePaths.banners.taiyakiIcon) : (room.shopImage || (room.candidatePosters && room.candidatePosters[0] && room.candidatePosters[0].imageUrl) || imagePaths.banners.taiyakiIcon),
          status: room.status,
          statusName: room.status === 'voting' ? '进行中' : '已结束',
          roomId: room.roomId,
          platform: room.platform,
          minAmount: room.minAmount,
          currentAmount: room.currentAmount || 0,
          isCreator: isCreator,
          creatorOpenId: room.creatorOpenId,
          creatorNickName: isCreator ? '我' : creatorInfo.nickName,
          creatorAvatarUrl: creatorInfo.avatarUrl,
          // 拼单参与者头像
          participantAvatars: room.participantAvatars || [],
          // 投票状态
          hasVoted: room.hasVoted || false,
          hasJoined: room.hasJoined || false
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
              const formatted = formatDeadline(apt.deadline);
              if (formatted) timeStr = formatted;
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
      
      // 并行查询 rooms、dining_appointments、scheduleVotes
      const [roomsResult, diningResult, scheduleVotesResult] = await Promise.allSettled([
        wx.cloud.callFunction({
          name: 'getMyRooms',
          data: {
            mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
          }
        }),
        // 全部模式下才查约饭和时间投票
        this.data.viewMode === 'all'
          ? wx.cloud.callFunction({ name: 'getMyDiningAppointments' })
          : Promise.resolve({ result: { success: false } }),
        this.data.viewMode === 'all'
          ? this.loadScheduleVotes('created')
          : Promise.resolve([])
      ]);

      // 处理 rooms 结果
      if (roomsResult.status === 'fulfilled' && roomsResult.value?.result?.code === 0 && roomsResult.value.result.data) {
        allMyRooms = [...roomsResult.value.result.data];
      }
      
      // 处理约饭结果
      if (diningResult.status === 'fulfilled' && diningResult.value?.result?.success && diningResult.value.result.appointments) {
        const diningRooms = diningResult.value.result.appointments.map(apt => ({
          _id: apt._id,
          roomId: apt._id,
          shopId: apt.shopId || '',
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

      // 处理时间投票结果
      if (scheduleVotesResult.status === 'fulfilled' && Array.isArray(scheduleVotesResult.value)) {
        const filteredVotes = filterSensitiveActivities(scheduleVotesResult.value);
        allMyRooms = [...allMyRooms, ...filteredVotes];
      }

      
      const rooms = allMyRooms.map(room => {
        // 根据 mode 或 isScheduleVote 确定类型（时间投票优先判断）
        let type = 'dining';
        let typeName = '聚会';
        if (room.isScheduleVote || room.type === 'scheduleVote') {
          type = 'scheduleVote';
          typeName = '时间投票';
        } else if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚会';
        }
        const isScheduleVoteType = room.isScheduleVote || room.type === 'scheduleVote';
        const isGroup = room.mode === 'group';
        const isMeal = room.mode === 'meal';
        // 确保 shopName 是字符串（时间投票用 shopName 字段存储日期信息）
        let shopName = isScheduleVoteType ? (room.shopName || '') : (isGroup ? (room.shopName || '外卖拼单') : (room.location || room.shopName || '地点待定'));
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（约饭显示报名截止，聚餐/拼单显示投票截止）
        let timeStr = room.voteDeadlineStr || room.deadline || room.activityTime || '时间待定';
        if (timeStr && timeStr !== '时间待定' && !room.voteDeadlineStr) {
          try {
            const formatted = formatDeadlineFull(timeStr);
            if (formatted) timeStr = formatted;
          } catch (e) {
          }
        }
        const _isCreator = room.creatorOpenId === myOpenId;
        return {
          id: room.roomId,
          type: type,
          typeName: typeName,
          title: room.title,
          shopId: room.shopId || '',
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
          isCreator: _isCreator,
          // 投票状态
          hasVoted: room.hasVoted || false,
          hasJoined: room.hasJoined || false,
          // 获取发起人信息
          creatorNickName: (() => {
            if (room.creatorNickName) return room.creatorNickName;
            if (room.creatorName) return room.creatorName;
            if (room.participants && Array.isArray(room.participants)) {
              const host = room.participants.find(p => p.isHost === true);
              if (host && host.nickName) return host.nickName;
            }
            return _isCreator ? '我' : (room.creatorNickName || '发起人');
          })(),
          creatorAvatarUrl: (() => {
            if (room.creatorAvatarUrl) return room.creatorAvatarUrl;
            if (room.participants && Array.isArray(room.participants)) {
              const host = room.participants.find(p => p.isHost === true);
              if (host && host.avatarUrl) return host.avatarUrl;
            }
            return imagePaths.decorations.catAvatarIcon;
          })()
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
              const formatted = formatDeadline(apt.deadline);
              if (formatted) timeStr = formatted;
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
            isCreator: apt.initiatorOpenId === myOpenId,
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
      
      // 并行查询 rooms、dining_appointments、scheduleVotes
      const [roomsResult, diningResult, scheduleVotesResult] = await Promise.allSettled([
        wx.cloud.callFunction({
          name: 'getRecentRooms',
          data: {
            limit: 100,
            mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
          }
        }),
        // 全部模式下才查约饭和时间投票
        this.data.viewMode === 'all'
          ? wx.cloud.callFunction({ name: 'getDiningAppointments' })
          : Promise.resolve({ result: { success: false } }),
        this.data.viewMode === 'all'
          ? this.loadScheduleVotes('participated')
          : Promise.resolve([])
      ]);

      // 处理 rooms 结果
      if (roomsResult.status === 'fulfilled' && roomsResult.value?.result?.success && roomsResult.value.result.rooms) {
        let filteredRooms = roomsResult.value.result.rooms;
        if (this.data.viewMode !== 'all') {
          filteredRooms = filteredRooms.filter(room => {
            if (this.data.viewMode === 'group') return room.mode === 'group';
            if (this.data.viewMode === 'dining') return room.mode === 'pick_for_them' || room.mode === 'b';
            return true;
          });
        }
        allParticipatedRooms = [...filteredRooms];
      }
      
      // 处理约饭结果（过滤出我参与的，排除我发起的）
      if (diningResult.status === 'fulfilled' && diningResult.value?.result?.success && diningResult.value.result.appointments) {
        const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
        const participated = diningResult.value.result.appointments.filter(apt => {
          return apt.participants && apt.participants.some(p => p.openId === myOpenId);
        });
        
        const diningRooms = participated.map(apt => ({
          _id: apt._id,
          roomId: apt._id,
          shopId: apt.shopId || '',
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

      // 处理时间投票结果
      if (scheduleVotesResult.status === 'fulfilled' && Array.isArray(scheduleVotesResult.value)) {
        const filteredVotes = filterSensitiveActivities(scheduleVotesResult.value);
        allParticipatedRooms = [...allParticipatedRooms, ...filteredVotes];
      }


      const rooms = allParticipatedRooms.map(room => {
        // 根据 mode 或 isScheduleVote 确定类型（时间投票优先判断）
        let type = 'dining';
        let typeName = '聚会';
        if (room.isScheduleVote || room.type === 'scheduleVote') {
          type = 'scheduleVote';
          typeName = '时间投票';
        } else if (room.mode === 'group') {
          type = 'group';
          typeName = '拼单';
        } else if (room.mode === 'meal') {
          type = 'meal';
          typeName = '约饭';
        } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
          type = 'dining';
          typeName = '聚会';
        }
        const isScheduleVoteType = room.isScheduleVote || room.type === 'scheduleVote';
        const isGroup = room.mode === 'group';
        // 确保 shopName 是字符串（时间投票用 shopName 字段存储日期信息）
        let shopName = isScheduleVoteType ? (room.shopName || '') : (isGroup ? (room.shopName || '外卖拼单') : (room.location || '地点待定'));
        if (shopName && typeof shopName === 'object') {
          shopName = shopName.name || shopName.title || JSON.stringify(shopName);
        }
        // 格式化时间（时间投票已格式化好，无需二次处理）
        let timeStr = isScheduleVoteType ? (room.time || '') : (room.deadline || room.activityTime || '时间待定');
        if (!isScheduleVoteType && timeStr && timeStr !== '时间待定') {
          try {
            const formatted = formatDeadlineFull(timeStr);
            if (formatted) timeStr = formatted;
          } catch (e) {
          }
        }
        return {
          id: room.roomId || room.id,
          type: type,
          typeName: typeName,
          title: room.title,
          shopId: room.shopId || '',
          shopName: shopName,
          time: timeStr,
          participantCount: room.participantCount || 0,
          image: isScheduleVoteType ? imagePaths.banners.taiyakiIcon : (room.shopImage || room.candidatePosters?.[0]?.imageUrl || imagePaths.banners.taiyakiIcon),
          status: room.status,
          statusName: room.status === 'voting' ? '进行中' : '已结束',
          roomId: room.roomId || room.id,
          platform: room.platform,
          minAmount: room.minAmount,
          currentAmount: room.currentAmount || 0,
          isCreator: false,
          // 投票状态
          hasVoted: room.hasVoted || false,
          hasJoined: room.hasJoined || false
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
              const formatted = formatDeadline(apt.deadline);
              if (formatted) timeStr = formatted;
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
      console.log('点击约饭活动:', { roomId, activity, activityShopId: activity?.shopId });
      const shopId = activity?.shopId;
      if (shopId) {
        wx.navigateTo({
          url: `/package-shop/pages/shop-detail/shop-detail?id=${shopId}`
        });
      } else {
        // 如果没有shopId，尝试用roomId（即appointment的_id）直接跳转到店铺详情页
        // 店铺详情页会根据appointmentId加载约饭信息
        console.warn('约饭活动缺少shopId，尝试使用roomId跳转:', roomId);
        wx.navigateTo({
          url: `/package-shop/pages/shop-detail/shop-detail?appointmentId=${roomId}`,
          fail: () => {
            wx.showToast({ title: '店铺信息缺失', icon: 'none' });
          }
        });
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
    const type = e.currentTarget.dataset.type;
    const activity = this.data.ongoingActivities.find(a => a.id === roomId) ||
                     this.data.myActivities.find(a => a.id === roomId) ||
                     this.data.participatedActivities.find(a => a.id === roomId);

    if (!roomId) {
      wx.showToast({ title: '房间ID无效', icon: 'none' });
      return;
    }

    // 优先使用传入的 type 参数，如果没有则使用查找结果的 type
    const activityType = type || activity?.type;

    // 根据活动类型跳转到不同页面
    if (activityType === 'scheduleVote') {
      // 时间投票 - 跳转到结果页（使用voteId参数）
      wx.navigateTo({
        url: `/package-schedule/pages/schedule-vote/result/result?voteId=${roomId}`,
        fail: (err) => {
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else if (activityType === 'group') {
      // 拼单活动 - 跳转到拼单详情页
      wx.navigateTo({
        url: `/package-vote/pages/group-detail/group-detail?roomId=${roomId}`,
        fail: (err) => {
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else if (activityType === 'meal') {
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
        // 如果没有shopId，尝试用appointmentId跳转
        console.warn('goToDetail约饭活动缺少shopId:', { roomId, activity });
        wx.navigateTo({
          url: `/package-shop/pages/shop-detail/shop-detail?appointmentId=${roomId}`,
          fail: () => {
            wx.showToast({ title: '店铺信息缺失', icon: 'none' });
          }
        });
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

  // 分享约饭活动
  shareAppointment(e) {
    const { id, title, shopname, type } = e.currentTarget.dataset;
    
    // 如果不是约饭类型，不处理
    if (type !== 'meal') return;

    // 构建分享内容
    const shareTitle = title && title !== '约饭活动' 
      ? `来一起吃饭吧！${title}` 
      : (shopname ? `来${shopname}一起约饭吧！` : '来喵不喵一起约饭吧！');
    
    // 通过按钮触发分享菜单
    // 使用 wx.showShareMenu + 手动方式或直接调用分享
    this.setData({
      shareData: {
        appointmentId: id,
        title: shareTitle,
        shopName: shopname || ''
      }
    });

    // 触发分享菜单（通过模拟右上角分享行为）
    // 小程序中需要用户主动点击分享按钮，这里我们用 showActionSheet 提示
    wx.showActionSheet({
      itemList: ['发送给朋友', '分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 发送给朋友 - 触发 onShareAppMessage
          // 由于无法直接调起分享，显示提示引导用户使用右上角分享
          wx.showToast({ title: '请点击右上角「...」分享给朋友', icon: 'none', duration: 2000 });
        } else if (res.tapIndex === 1) {
          // 分享到朋友圈 - 触发 onShareTimeline
          wx.showToast({ title: '请点击右上角「...」分享到朋友圈', icon: 'none', duration: 2000 });
        }
      }
    });
  },

  // 重写 onShareAppMessage 以支持约饭活动分享（支持 button open-type=share 触发）
  onShareAppMessage(e) {
    // 优先从触发事件的 dataset 获取数据（button open-type=share 触发时）
    const ds = e?.target?.dataset || {};
    const id = ds.id || '';
    const title = ds.title || '';
    const shopname = ds.shopname || '';
    const type = ds.type || '';
    
    // 如果是从约饭分享按钮触发的
    if (type === 'meal' && id) {
      const shareTitle = title && title !== '约饭活动'
        ? `来一起吃饭吧！${title}`
        : (shopname ? `来${shopname}一起约饭吧！` : '来喵不喵一起约饭吧！');
      
      console.log('[fish-tank] 触发约饭分享:', { id, title, shopname });
      return {
        title: shareTitle,
        path: `/package-shop/pages/shop-detail/shop-detail?appointmentId=${id}`,
        imageUrl: ''
      };
    }
    
    // 如果有预设的分享数据（兼容旧逻辑）
    const { shareData } = this.data;
    if (shareData && shareData.appointmentId) {
      return {
        title: shareData.title || '来喵不喵一起约饭',
        path: `/package-shop/pages/shop-detail/shop-detail?appointmentId=${shareData.appointmentId}`,
        imageUrl: ''
      };
    }

    // 默认分享
    return {
      title: '来喵不喵一起拼单',
      path: '/pages/fish-tank/fish-tank'
    };
  },

  // 支持分享到朋友圈
  onShareTimeline() {
    const { shareData } = this.data;
    
    if (shareData && shareData.appointmentId) {
      return {
        title: shareData.title || '来喵不喵一起约饭',
        query: `appointmentId=${shareData.appointmentId}`,
        imageUrl: ''
      };
    }

    return {
      title: '来喵不喵一起拼单约饭'
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
            // 判断是否是时间投票活动
            const isScheduleVoteActivity = item.type === 'scheduleVote' || item.isScheduleVote === true;
            if (isScheduleVoteActivity) {
              // 时间投票活动使用 deleteScheduleVote
              const voteIdToDelete = item.id || item.roomId;
              console.log('删除时间投票, voteId:', voteIdToDelete, 'item:', JSON.stringify({ id: item.id, roomId: item.roomId, type: item.type }));
              const { result: deleteResult } = await wx.cloud.callFunction({
                name: 'deleteScheduleVote',
                data: { voteId: voteIdToDelete }
              });
              console.log('删除时间投票结果:', JSON.stringify(deleteResult));
              result = deleteResult;
            } else if (isMealActivity) {
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
            if (result.code === 0 || result.success === true) {
              successCount++;
            } else {
              console.log('删除失败详情:', JSON.stringify(result));
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
    const { id, index, type, listType } = e.currentTarget.dataset;
    const { isEditMode } = this.data;
    
    if (!isEditMode) {
      // 非编辑模式下，进入详情页
      this.goToActivityDetail({ currentTarget: { dataset: { id, type } } });
    } else {
      // 编辑模式下，切换选中状态
      this.toggleSelect({ currentTarget: { dataset: { index, type: listType } } });
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

  // ========== 预加载 & 静默刷新 ==========

  /**
   * 后台静默刷新：不显示 loading，失败无提示
   * 用于 onShow 时有旧数据的情况，后台更新数据后无缝替换
   */
  async _silentRefresh() {
    if (this._silentRefreshing) return;
    this._silentRefreshing = true;

    try {
      await Promise.all([
        this.loadOngoingRooms(),
        this.loadMyRooms(),
        this.loadParticipatedRooms()
      ]);
    } catch (err) {
      // 静默失败，不影响用户体验
      console.warn('[fish-tank] 静默刷新失败:', err.message);
    } finally {
      this._silentRefreshing = false;
    }
  },

  /**
   * 注册预加载器到全局预加载管理器
   * app.js 可以在用户操作其它页面时调用这些 loader 后台加载数据
   */
  _registerPreloaders() {
    if (!preloadManager) return;

    const self = this;

    // 注册"正在进行"的预加载器
    preloadManager.registerLoader('fish-tank', async () => {
      const viewMode = self.data.viewMode || 'all';
      
      try {
        const [roomsResult, diningResult, scheduleVotesResult] = await Promise.allSettled([
          wx.cloud.callFunction({ name: 'getAllRooms', data: { limit: 100, mode: viewMode === 'all' ? 'all' : viewMode } }),
          viewMode === 'all' ? wx.cloud.callFunction({ name: 'getDiningAppointments', data: { limit: 100 } }) : Promise.resolve({ result: { success: false } }),
          viewMode === 'all' ? self.loadScheduleVotes('all') : Promise.resolve([])
        ]);

        let allRooms = [];
        if (roomsResult.status === 'fulfilled' && roomsResult.value?.result?.success && roomsResult.value.result.rooms) {
          allRooms = [...roomsResult.value.result.rooms];
        }
        if (diningResult.status === 'fulfilled' && diningResult.value?.result?.success && diningResult.value.result.appointments) {
          const diningRooms = diningResult.value.result.appointments.map(apt => ({
            _id: apt._id, roomId: apt._id, title: apt.shopName || '约饭活动', status: 'voting',
            mode: 'meal', deadline: apt.deadline, location: apt.shopName, shopName: apt.shopName,
            shopImage: '', participantCount: apt.participantCount || 0,
            creatorNickName: apt.initiatorName || '神秘喵友', creatorAvatarUrl: apt.initiatorAvatar || ''
          }));
          allRooms = [...allRooms, ...diningRooms];
        }
        if (scheduleVotesResult.status === 'fulfilled' && Array.isArray(scheduleVotesResult.value)) {
          const ongoingVotes = scheduleVotesResult.value.filter(v => v.status === 'voting');
          allRooms = [...allRooms, ...ongoingVotes];
        }

        // 格式化（精简版，只做必要处理）
        const myOpenId = getApp().globalData.openid || wx.getStorageSync('openid');
        const rooms = allRooms.map(room => {
          let type = 'dining', typeName = '聚会';
          if (room.isScheduleVote || room.type === 'scheduleVote') { type = 'scheduleVote'; typeName = '时间投票'; }
          else if (room.mode === 'group') { type = 'group'; typeName = '拼单'; }
          else if (room.mode === 'meal') { type = 'meal'; typeName = '约饭'; }
          
          let timeStr = room.deadline || room.activityTime || '时间待定';
          let shopName = room.isScheduleVote ? (room.shopName || '') : (room.mode === 'group' ? (room.shopName || '外卖拼单') : (room.location || room.shopName || '地点待定'));
          
          return {
            id: room.roomId || room.id, type, typeName, title: room.title,
            shopName: room.isScheduleVote ? room.shopName : (room.mode === 'meal' ? room.shopName : shopName),
            time: room.isScheduleVote ? (room.time || timeStr) : timeStr,
            participantCount: room.participantCount || 0,
            image: room.isScheduleVote ? (imagePaths.banners.taiyakiIcon) : (room.shopImage || imagePaths.banners.taiyakiIcon),
            status: room.status, statusName: room.status === 'voting' ? '进行中' : '已结束',
            roomId: room.roomId, platform: room.platform,
            isCreator: room.creatorOpenId === myOpenId || room.isCreator === true,
            creatorNickName: room.isCreator ? '我' : (room.creatorNickName || '神秘喵友'),
            creatorAvatarUrl: room.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon,
            participantAvatars: room.participantAvatars || []
          };
        });

        const processed = self.processActivitiesDeadline(rooms);
        const filtered = filterSensitiveActivities(processed);

        return {
          ongoingActivities: filtered,
          ongoingCount: filtered.length
        };
      } catch (err) {
        return null;
      }
    });
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
