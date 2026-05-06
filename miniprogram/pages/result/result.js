const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

Page({
  data: {
    roomId: '',
    room: {},
    loading: true,
    isCreator: false,
    voteStats: null,
    imagePaths: imagePaths,
    showPosterModal: false,
    posterData: null,
    platformAppIds: {
      meituan: 'wxde8ac0a21135c07d',
      dianping: 'wxc0d6fdfa1c166f6c',
      jd: 'wx91d27dbf599dff74'
    }
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomData();
  },

  onShow() {
    if (this.data.roomId) {
      this.loadRoomData();
    }
  },

  async loadRoomData() {
    try {
      this.setData({ loading: true });

      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;

      // 获取投票统计（Mode B 需要）
      let voteStats = null;
      if (room.mode === 'b' && room.status === 'locked') {
        const statsResult = await wx.cloud.callFunction({
          name: 'countVotes',
          data: { roomId: this.data.roomId }
        });
        if (statsResult.result.code === 0) {
          voteStats = statsResult.result.data;
        }
      }

      this.setData({
        room,
        isCreator: room.isCreator,
        voteStats,
        loading: false
      });

      // 结果页加载完成，播放轻柔喵叫
      if (room.status === 'locked') {
        audioManager.playMeowSoft();
      }
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 预览海报
  previewPoster() {
    const finalPoster = this.data.room.finalPoster;
    if (finalPoster && finalPoster.imageUrl) {
      wx.previewImage({
        urls: [finalPoster.imageUrl],
        current: finalPoster.imageUrl
      });
    }
  },

  // 跳转到平台小程序
  goToPlatform() {
    const { room, platformAppIds } = this.data;
    const platform = room.finalPoster?.platformSource || room.platform;
    
    if (!platform || !platformAppIds[platform]) {
      wx.showToast({ title: '未知平台', icon: 'none' });
      return;
    }

    const appId = platformAppIds[platform];
    
    wx.navigateToMiniProgram({
      appId,
      path: 'pages/index/index',
      extraData: { from: 'miaolegeyu' },
      success: () => {
        console.log('跳转成功');
      },
      fail: (err) => {
        console.log('跳转失败', err);
        wx.showToast({ title: '跳转失败，请手动打开', icon: 'none' });
      }
    });
  },

  // 复制地址
  copyAddress() {
    const address = this.data.room.finalPoster?.address;
    if (address) {
      wx.setClipboardData({
        data: address,
        success: () => {
          wx.showToast({ title: '地址已复制', icon: 'success' });
        }
      });
    }
  },

  // 导航去店
  openNavigation() {
    const address = this.data.room.finalPoster?.address;
    if (!address) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: ['使用高德地图', '使用腾讯地图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 高德地图
          wx.navigateTo({
            url: `plugin://chooseLocation/index?key=YOUR_AMAP_KEY&referer=miaolegeyu&location=${JSON.stringify({})}&address=${address}`
          });
        } else {
          // 腾讯地图
          wx.openLocation({
            address,
            scale: 18
          });
        }
      }
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

// 去结算
goSettlement() {
wx.navigateTo({
url: `/pages/settlement/settlement?roomId=${this.data.roomId}`
});
},

// 跳转到推荐餐厅页面
goRecommendRestaurant() {
const { roomId, voteStats } = this.data;
const topMatch = voteStats.bestMatches[0];
const cuisineType = `${topMatch.categoryName}-${topMatch.subCategoryName}`;
wx.navigateTo({
url: `/pages/recommend-restaurant/recommend-restaurant?roomId=${roomId}&cuisineType=${encodeURIComponent(cuisineType)}`
});
},

  // 添加到手机日历
  addToCalendar() {
    const { room } = this.data;
    const poster = room.finalPoster;

    if (!poster || !poster.time) {
      wx.showToast({ title: '暂无时间信息', icon: 'none' });
      return;
    }

    // 解析时间字符串，支持多种格式
    const timeStr = poster.time;
    const dateInfo = this.parseTimeString(timeStr);

    if (!dateInfo.startTime) {
      wx.showToast({ title: '时间格式无法识别', icon: 'none' });
      return;
    }

    // 构建日历事件数据
    const eventData = {
      title: room.title || '聚餐',
      startTime: dateInfo.startTime,
      endTime: dateInfo.endTime,
      location: poster.address || '',
      description: `聚餐地点：${poster.name || ''}\n地址：${poster.address || ''}\n来自：喵了个鱼小程序`,
      alarmOffset: 3600 // 提前1小时提醒
    };

    // 调用系统日历 API
    wx.addPhoneCalendar({
      ...eventData,
      success: () => {
        wx.showToast({ title: '已添加到日历', icon: 'success' });
      },
      fail: (err) => {
        console.error('添加日历失败:', err);
        // 如果系统 API 失败，提供备选方案
        this.showCalendarFallback(eventData);
      }
    });
  },

  // 解析时间字符串
  parseTimeString(timeStr) {
    const now = new Date();
    let startTime = '';
    let endTime = '';

    // 尝试匹配 "MM月DD日 HH:MM" 格式
    const pattern1 = /(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/;
    // 尝试匹配 "YYYY-MM-DD HH:MM" 格式
    const pattern2 = /(\d{4})-(\d{2})-(\d{2})\s*(\d{2}):(\d{2})/;
    // 尝试匹配 "今天/明天 HH:MM" 格式
    const pattern3 = /(今天|明天)\s*(\d{1,2}):(\d{2})/;
    // 尝试匹配纯时间 "HH:MM"
    const pattern4 = /(\d{1,2}):(\d{2})/;

    let match;
    let year = now.getFullYear();
    let month, day, hour, minute;

    if ((match = timeStr.match(pattern1))) {
      month = parseInt(match[1]) - 1;
      day = parseInt(match[2]);
      hour = parseInt(match[3]);
      minute = parseInt(match[4]);
    } else if ((match = timeStr.match(pattern2))) {
      year = parseInt(match[1]);
      month = parseInt(match[2]) - 1;
      day = parseInt(match[3]);
      hour = parseInt(match[4]);
      minute = parseInt(match[5]);
    } else if ((match = timeStr.match(pattern3))) {
      const offset = match[1] === '明天' ? 1 : 0;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + offset);
      year = targetDate.getFullYear();
      month = targetDate.getMonth();
      day = targetDate.getDate();
      hour = parseInt(match[2]);
      minute = parseInt(match[3]);
    } else if ((match = timeStr.match(pattern4))) {
      // 只有时间，使用今天日期
      month = now.getMonth();
      day = now.getDate();
      hour = parseInt(match[1]);
      minute = parseInt(match[2]);

      // 如果时间已过，假设是明天
      if (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes())) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        year = tomorrow.getFullYear();
        month = tomorrow.getMonth();
        day = tomorrow.getDate();
      }
    } else {
      return { startTime: '', endTime: '' };
    }

    // 构建开始时间
    const startDate = new Date(year, month, day, hour, minute);
    startTime = this.formatCalendarTime(startDate);

    // 默认聚餐时长2小时
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    endTime = this.formatCalendarTime(endDate);

    return { startTime, endTime };
  },

  // 格式化为日历 API 需要的格式：YYYY-MM-DD HH:MM:SS（使用本地时间）
  formatCalendarTime(date) {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  },

  // 备选方案：当系统日历 API 失败时，提供复制功能
  showCalendarFallback(eventData) {
    const { title, startTime, location, description } = eventData;
    const text = `📅 ${title}\n🕐 ${startTime}\n📍 ${location}\n\n${description}`;

    wx.showModal({
      title: '手动添加到日历',
      content: '系统日历添加失败，您可以复制以下信息手动添加：',
      confirmText: '复制信息',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: text,
            success: () => {
              wx.showToast({ title: '已复制，请粘贴到日历', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 生成分享签名（简单的安全验证）
  generateShareSign(roomId) {
    // 使用房间ID和时间戳生成简单签名
    const timestamp = Date.now();
    // 注意：实际项目中应该使用更复杂的签名算法，这里简化处理
    const sign = `${roomId}_${timestamp}`;
    return { sign, timestamp };
  },

  // 生成小程序码
  async generateQRCodeForPoster() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${this.data.roomId}`,
          page: 'pages/vote/vote',
          width: 280
        }
      });
      if (result.code === 0 && result.data) {
        return result.data;
      }
    } catch (err) {
      console.error('生成小程序码失败:', err);
    }
    return '';
  },

  // 生成结果海报（使用 poster-modal 组件）
  async showResultPoster() {
    const { room } = this.data;
    const winner = room.finalPoster || {};

    // 生成小程序码
    let qrCodeUrl = '';
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${this.data.roomId}`,
          page: 'pages/vote/vote',
          width: 280
        }
      });
      if (result.code === 0 && result.data) {
        qrCodeUrl = result.data;
      }
    } catch (err) {
      console.error('[result] 生成小程序码失败:', err);
    }

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
      roomTime: (room.activityDate && room.activityTime) ? (room.activityDate + ' ' + room.activityTime) : (room.activityDate || room.activityTime || winner.time || ''),
      roomAddress: room.location?.name || room.location || '',
      participants: room.participants || [],
      isAnonymous: room.isAnonymous || false,
      qrCodeUrl: qrCodeUrl
    };

    this.setData({
      posterData,
      showPosterModal: true
    });
    console.log('[result] 显示结果海报弹窗, mode:', room.mode);
  },

  // 海报弹窗事件
  onPosterClose() {
    this.setData({
      showPosterModal: false,
      posterData: null
    });
  },

  onPosterSave(e) {
    // poster-modal 组件内部已处理保存逻辑
    console.log('[result] 海报已保存');
  },

  onPosterShareFriend(e) {
    // poster-modal 组件内部已触发分享，此处可做额外处理
    console.log('[result] 海报已分享');
  },

  // 分享
  onShareAppMessage() {
    const { room, roomId } = this.data;
    const { sign, timestamp } = this.generateShareSign(roomId);

    return {
      title: `【${room.title}】投票结果出炉！`,
      path: `/pages/result/result?roomId=${roomId}&sign=${sign}&t=${timestamp}`,
      imageUrl: room.finalPoster?.imageUrl || ''
    };
  }
});
