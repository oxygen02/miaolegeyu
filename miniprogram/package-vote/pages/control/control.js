const ANON_NAMES = ['吃货喵', '馋嘴猫', '干饭喵', '探店喵', '觅食喵', '品鉴喵', '寻味喵', '尝鲜喵', '老饕喵', '滋味喵'];
const { imagePaths } = getApp().globalData;
const { CONTROL_TEXTS } = require('../../utils/i18n');

Page({
  data: {
    imagePaths: imagePaths,
    roomId: '',
    roomMode: 'a',
    bannerCatUrl: imagePaths.misc.juzeAvatar,
    roomCode: '',
    roomTitle: '',
    roomAddress: '',
    roomTime: '',
    voteDeadline: '',
    roomStatus: 'voting',
    statusText: '投票中',
    isAnonymous: false,
    countdown: '00:00:00',
    countdownTimer: null,
    pollTimer: null,
    votedCount: 0,
    unvotedCount: 0,
    progressPercent: 0,
    shareCount: 0,
    joinRate: 0,
    entryJoinCount: 0,
    participants: [],
    topOptions: [],
    winner: null,
    candidatePosters: [], // 候选海报列表
    isLoading: true
  },

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    if (!src) return;
    wx.previewImage({ current: src, urls: [src] });
  },

  // 安全提取字符串值：如果 val 是对象/非字符串，返回空字符串而非 [object Object]
  _safeString(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    // 对象类型（Date、GeoPoint 等）不渲染
    return '';
  },

  parseDeadline(deadlineValue) {
    if (!deadlineValue) {
      return null;
    }

    let deadline;

    if (typeof deadlineValue === 'string') {
      if (deadlineValue.includes('月') && deadlineValue.includes('日')) {
        const now = new Date();
        const year = now.getFullYear();
        const monthMatch = deadlineValue.match(/(\d+)月/);
        const dayMatch = deadlineValue.match(/(\d+)日/);
        const hourMatch = deadlineValue.match(/(\d+):(\d{2})/);

        if (!monthMatch || !dayMatch) {
          return null;
        }

        const month = parseInt(monthMatch[1]) - 1;
        const day = parseInt(dayMatch[1]);
        const hour = hourMatch ? parseInt(hourMatch[1]) : 23;
        const minute = hourMatch ? parseInt(hourMatch[2]) : 59;

        deadline = new Date(year, month, day, hour, minute, 0, 0);

        if (deadline.getTime() < now.getTime()) {
          deadline = new Date(year + 1, month, day, hour, minute, 0, 0);
        }
      } else {
        deadline = new Date(deadlineValue);
      }
    } else if (typeof deadlineValue === 'number') {
      deadline = new Date(deadlineValue);
    } else if (typeof deadlineValue === 'object' && deadlineValue !== null) {
      // 云数据库 Date 类型序列化后的格式（$date 为 UTC 时间字符串）
      if (deadlineValue.$date) {
        deadline = new Date(deadlineValue.$date);
      } else if (deadlineValue._date) {
        deadline = new Date(deadlineValue._date);
      } else {
        deadline = new Date(deadlineValue);
      }
    } else {
      return null;
    }

    if (isNaN(deadline.getTime())) {
      return null;
    }

    return deadline.getTime();
  },

  onLoad(options) {
    const roomId = options.roomId || '';
    this.setData({ roomId });
    
    // 启用分享菜单（允许转发给朋友和朋友圈）
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
    
    const deadline = this.parseDeadline(this.data.roomTime);
    if (deadline) {
      this.setData({ voteDeadline: deadline });
    }
    
    this.startCountdown();
    this.calculateStats(this.data.participants);
    
    if (roomId && wx.cloud) {
      this.fetchRoomData(roomId);
    }
  },

  onUnload() { this.clearAllTimers(); },
  onHide() { this.clearAllTimers(); },

  onShow() {
    this.startCountdown();
    if (this.data.roomId && this.data.roomStatus === 'voting' && wx.cloud) {
      this.startPolling();
    }
  },

  fetchRoomData(roomId) {
    // 第一阶段：先用轻量 getRoom 获取基础数据（含 deadline/mode/status），立即启动倒计时
    wx.cloud.callFunction({
      name: 'getRoom',
      data: { roomId },
      timeout: 5000
    }).then(res => {
      if (res.result && res.result.code === 0 && res.result.data) {
        const room = res.result.data;
        let deadline = null;
        const rawDeadline = room.deadline || room.voteDeadline;
        if (rawDeadline) {
          deadline = this.parseDeadline(rawDeadline);
        }
        console.log('[control-1] getRoom 截止时间:', JSON.stringify(rawDeadline), '解析:', deadline);
        console.log('[control-1] address类型:', typeof room.address, 'location类型:', typeof room.location, 'mealTime类型:', typeof room.mealTime, 'time类型:', typeof room.time);

        this.setData({
          roomTitle: room.title || '',
          roomAddress: this._safeString(room.address) || this._safeString(room.location) || '',
          roomTime: this._safeString(room.mealTime) || this._safeString(room.time) || '',
          voteDeadline: deadline || '',
          roomStatus: room.status || 'voting',
          roomMode: room.mode || 'a',
          isAnonymous: room.isAnonymous || false,
          bannerCatUrl: room.creatorAvatarUrl || imagePaths.misc.juzeAvatar,
          roomCode: room.roomCode || room.roomId || this.data.roomCode,
          candidatePosters: room.candidatePosters || [] // 保存候选海报列表
        });
        this.updateStatusText();
        this.startCountdown();
      }
    }).catch(err => {
      console.error('[control-1] getRoom 失败:', err);
    });

    // 第二阶段：用 getRoomDetail 获取完整统计数据（参与者、投票统计等）
    wx.cloud.callFunction({
      name: 'getRoomDetail',
      data: { roomId },
      timeout: 10000
    }).then(res => {
      if (res.result && res.result.code === 0 && res.result.data) {
        const room = res.result.data;
        const isAnon = room.isAnonymous || false;
        const participants = (room.participants || []).map((p, idx) => ({
          ...p,
          anonName: ANON_NAMES[idx % ANON_NAMES.length] + (idx >= ANON_NAMES.length ? (idx + 1) : '')
        }));

        const stats = room.stats || {};
        const votedCount = stats.votedCount !== undefined ? stats.votedCount : participants.filter(p => p.isVoted).length;
        const unvotedCount = stats.unvotedCount !== undefined ? stats.unvotedCount : (participants.length - votedCount);
        const progressPercent = stats.progressPercent !== undefined ? stats.progressPercent : (participants.length > 0 ? Math.round((votedCount / participants.length) * 100) : 0);
        const shareCount = stats.shareCount || 0;
        const joinRate = stats.joinRate !== undefined ? stats.joinRate : (participants.length > 0 ? 100 : 0);
        const entryJoinCount = stats.entryJoinCount || 0;

        const topOptions = (room.topOptions || []).map(opt => ({
          ...opt,
          image: opt.image || imagePaths.banners.taiyakiIcon
        }));

        // 用 getRoomDetail 的数据覆盖/补充（特别是 deadline 可能更准确）
        let deadline = null;
        const rawDeadline = room.deadline || room.voteDeadline;
        if (rawDeadline) {
          deadline = this.parseDeadline(rawDeadline);
        }
        console.log('[control-2] getRoomDetail 截止时间:', JSON.stringify(rawDeadline), '解析:', deadline);

        this.setData({
          roomTitle: room.title || '',
          roomAddress: this._safeString(room.location) || this._safeString(room.address) || '',
          roomTime: this._safeString(room.time) || '',
          voteDeadline: deadline || this.data.voteDeadline,
          roomStatus: room.status || 'voting',
          roomMode: room.mode || 'a',
          isAnonymous: isAnon,
          participants: participants,
          bannerCatUrl: room.creatorAvatarUrl || imagePaths.misc.juzeAvatar,
          roomCode: room.code || this.data.roomCode,
          votedCount,
          unvotedCount,
          progressPercent,
          shareCount,
          joinRate,
          entryJoinCount,
          topOptions,
          isLoading: false
        });

        this.updateStatusText();
        this.startCountdown();
      }
    }).catch(err => {
      console.error('[control-2] getRoomDetail 失败:', err);
      // getRoomDetail 失败时，如果第一阶段 getRoom 已返回了基础数据，页面仍可用
      if (this.data.roomTitle) {
        this.setData({ isLoading: false });
      }
    });
  },

  calculateStats(participants) {
    const votedCount = participants.filter(p => p.isVoted).length;
    const unvotedCount = participants.length - votedCount;
    const progressPercent = participants.length > 0 ? Math.round((votedCount / participants.length) * 100) : 0;
    this.setData({ votedCount, unvotedCount, progressPercent });
  },

  startCountdown() {
    this.stopCountdown();
    
    let targetTime;
    
    if (this.data.voteDeadline) {
      targetTime = typeof this.data.voteDeadline === 'string' 
        ? new Date(this.data.voteDeadline).getTime() 
        : this.data.voteDeadline;
    } else if (this.data.roomTime) {
      targetTime = this.parseDeadline(this.data.roomTime);
    }
    
    if (!targetTime || isNaN(targetTime)) {
      targetTime = Date.now() + 2 * 60 * 60 * 1000;
      console.log('[倒计时] 未设置截止时间，使用默认值（当前+2小时）');
    }
    
    if (targetTime <= Date.now()) {
      this.setData({ countdown: '00:00:00' });
      return;
    }
    
    this.updateCountdown(targetTime);
    this.data.countdownTimer = setInterval(() => {
      this.updateCountdown(targetTime);
    }, 1000);
  },

  stopCountdown() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.data.countdownTimer = null;
    }
  },

  updateCountdown(targetTime) {
    const now = Date.now();
    const diff = targetTime - now;
    
    if (diff <= 0) {
      this.setData({ countdown: '00:00:00' });
      this.stopCountdown();
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    this.setData({
      countdown: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    });
  },

  startPolling() {
    this.stopPolling();
    this.data.pollTimer = setInterval(() => {
      if (this.data.roomId && wx.cloud) {
        this.fetchRoomData(this.data.roomId);
      }
    }, 15000);
  },

  stopPolling() {
    if (this.data.pollTimer) {
      clearInterval(this.data.pollTimer);
      this.data.pollTimer = null;
    }
  },

  clearAllTimers() {
    this.stopCountdown();
    this.stopPolling();
  },

  updateStatusText() {
    this.setData({ statusText: CONTROL_TEXTS.statusMap[this.data.roomStatus] || '未知' });
  },

  toggleAnonymous() {
    const newValue = !this.data.isAnonymous;
    this.setData({ isAnonymous: newValue });
    // 同步到服务端
    if (this.data.roomId && wx.cloud) {
      wx.cloud.callFunction({
        name: 'updateRoom',
        data: {
          roomId: this.data.roomId,
          isAnonymous: newValue
        }
      }).then(res => {
        if (res.result && res.result.code === 0) {
          wx.showToast({ title: newValue ? CONTROL_TEXTS.toast.anonymousOn : CONTROL_TEXTS.toast.anonymousOff, icon: 'success' });
        } else {
          wx.showToast({ title: res.result?.msg || CONTROL_TEXTS.toast.settingFailed, icon: 'none' });
          // 回滚本地状态
          this.setData({ isAnonymous: !newValue });
        }
      }).catch(err => {
        console.error('同步匿名状态失败:', err);
        wx.showToast({ title: CONTROL_TEXTS.toast.settingFailed, icon: 'none' });
        // 回滚本地状态
        this.setData({ isAnonymous: !newValue });
      });
    }
  },

  copyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => { wx.showToast({ title: CONTROL_TEXTS.toast.copied, icon: 'success' }); }
    });
  },

  async shareRoom() {
    // 邀请按钮 - 复制链接 + 提示用户分享（带分享码）
    wx.showLoading({ title: '生成分享链接...' });

    try {
      // 创建分享链，获取分享码
      const { result } = await wx.cloud.callFunction({
        name: 'createShareChain',
        data: {
          targetId: this.data.roomId,
          type: 'room',
          expireHours: 24
        }
      });

      if (!result || !result.success) {
        throw new Error(result?.error || '创建分享链失败');
      }

      const shareCode = result.shareCode;
      const shareUrl = `/package-vote/pages/vote/vote?shareCode=${shareCode}`;

      wx.hideLoading();

      wx.showModal({
        title: '邀请好友',
        content: '选择分享方式',
        confirmText: '复制链接',
        cancelText: '直接分享',
        success: (res) => {
          if (res.confirm) {
            // 复制链接到剪贴板
            wx.setClipboardData({
              data: `来喵不喵一起投票：${this.data.roomTitle}\n${shareUrl}`,
              success: () => {
                wx.showToast({ title: '链接已复制，快去发送给好友吧', icon: 'success' });
              }
            });
          } else {
            // 提示用户使用右上角分享
            wx.showToast({ title: '请点击右上角「...」分享', icon: 'none', duration: 2000 });
          }
        }
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[control] 创建分享链失败:', err);
      wx.showToast({ title: '分享链接生成失败', icon: 'none' });
    }
  },

  handleMemberTap(e) {
    const index = e.currentTarget.dataset.index;
    const participant = this.data.participants[index];
    if (!this.data.isAnonymous || !participant.isVoted) {
      wx.showModal({
        title: participant.nickName,
        content: participant.isVoted ? CONTROL_TEXTS.modal.memberVoted : CONTROL_TEXTS.modal.memberUnvoted,
        showCancel: false
      });
    }
  },

  async remindMember(e) {
    const id = e.currentTarget.dataset.id;
    // 提醒链接使用分享码
    wx.showLoading({ title: '生成链接...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'createShareChain',
        data: {
          targetId: this.data.roomId,
          type: 'room',
          expireHours: 24
        }
      });

      wx.hideLoading();

      if (!result || !result.success) {
        throw new Error(result?.error || '创建分享链失败');
      }

      const shareCode = result.shareCode;
      const shareUrl = `/package-vote/pages/vote/vote?shareCode=${shareCode}`;

      wx.setClipboardData({
        data: shareUrl,
        success: () => {
          wx.showToast({ title: CONTROL_TEXTS.toast.shareSuccess, icon: 'success' });
        }
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[control] 创建分享链失败:', err);
      wx.showToast({ title: '链接生成失败', icon: 'none' });
    }
  },

  editRoom() {
    if (this.data.roomStatus === 'ended') {
      wx.showToast({ title: CONTROL_TEXTS.toast.editExpired, icon: 'none' });
      return;
    }
    wx.showLoading({ title: '加载中...', mask: true });
    // 使用 getRoom（无房主权限校验）查询 mode，避免 getRoomDetail 对非房主返回 403
    wx.cloud.callFunction({
      name: 'getRoom',
      data: { roomId: this.data.roomId },
      timeout: 5000
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.code === 0 && res.result.data) {
        const roomData = res.result.data;
        const rawMode = roomData.mode || 'a';
        // 兼容旧数据：pick_for_them + 有 candidatePosters → 实际是 Mode A
        let mode = rawMode;
        if (rawMode === 'pick_for_them') {
          const hasCandidatePosters = !!(roomData.candidatePosters && roomData.candidatePosters.length > 0);
          const hasCuisineOptions = !!roomData.cuisineOptions;
          if (hasCandidatePosters || (!hasCuisineOptions)) {
            mode = 'a'; // 修正为 Mode A
            console.log('[control] editRoom 旧数据兼容: pick_for_them → a');
          }
        }
        console.log('[control] editRoom mode判断:', 'rawMode:', rawMode, '→ 最终:', mode);
        let url;
        if (mode === 'b') {
          url = `/package-create/pages/create-mode-b/create-mode-b?edit=true&roomId=${this.data.roomId}`;
        } else {
          url = `/package-create/pages/create-mode-a/create-mode-a?edit=true&roomId=${this.data.roomId}`;
        }
        wx.navigateTo({ url });
      } else {
        wx.hideLoading();
        wx.showToast({ title: '获取活动信息失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('editRoom 查询失败:', err);
      // 降级：使用本地缓存的 roomMode
      const rawMode = this.data.roomMode || 'a';
      let mode = rawMode;
      if (rawMode === 'pick_for_them') {
        // 降级时无法获取 candidatePosters，保守判断为 Mode B（因为 pick_for_them 原本是 Mode B 的值）
        mode = 'b';
      }
      console.log('[control] editRoom 降级mode:', 'rawMode:', rawMode, '→ 最终:', mode);
      let url;
      if (mode === 'b') {
        url = `/package-create/pages/create-mode-b/create-mode-b?edit=true&roomId=${this.data.roomId}`;
      } else {
        url = `/package-create/pages/create-mode-a/create-mode-a?edit=true&roomId=${this.data.roomId}`;
      }
      wx.navigateTo({ url });
    });
  },

  lockResult() {
    if (this.data.roomStatus === 'locked' || this.data.roomStatus === 'ended') return;
    wx.showModal({
      title: CONTROL_TEXTS.modal.lockTitle,
      content: CONTROL_TEXTS.modal.lockContent,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: CONTROL_TEXTS.loading.locking });
          // 调用云函数锁定房间
          wx.cloud.callFunction({
            name: 'lockRoom',
            data: {
              roomId: this.data.roomId
            }
          }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.code === 0) {
              this.setData({ roomStatus: 'locked', statusText: CONTROL_TEXTS.statusMap.locked });
              wx.showToast({ title: CONTROL_TEXTS.toast.locked, icon: 'success' });
            } else {
              wx.showToast({ title: res.result?.msg || CONTROL_TEXTS.toast.lockFailed, icon: 'none' });
            }
          }).catch(err => {
            wx.hideLoading();
            console.error('锁定失败:', err);
            wx.showToast({ title: CONTROL_TEXTS.toast.lockFailed, icon: 'none' });
          });
        }
      }
    });
  },

  shareToFriends() {
    // 邀请好友按钮 - 弹出分享选项（带分享人标识）
    const sharerOpenId = getApp().globalData.openid || wx.getStorageSync('openid') || '';
    const shareUrl = `/package-vote/pages/vote/vote?roomId=${this.data.roomId}&shareFrom=${sharerOpenId}`;
    wx.showActionSheet({
      itemList: ['复制邀请链接', '分享到微信好友', '分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制链接
          wx.setClipboardData({
            data: `来喵不喵一起投票：${this.data.roomTitle}\n${shareUrl}`,
            success: () => {
              wx.showToast({ title: '链接已复制，快去发送给好友吧', icon: 'success' });
            }
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: '请点击右上角「...」分享给好友', icon: 'none', duration: 2000 });
        } else if (res.tapIndex === 2) {
          wx.showToast({ title: '请点击右上角「...」分享到朋友圈', icon: 'none', duration: 2000 });
        }
      }
    });
  },

  async getShareInfo() {
    // 创建分享链，获取分享码
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'createShareChain',
        data: {
          targetId: this.data.roomId,
          type: 'room',
          expireHours: 24
        }
      });

      if (result && result.success) {
        return {
          title: this.data.roomTitle,
          path: `/package-vote/pages/vote/vote?shareCode=${result.shareCode}`,
          imageUrl: imagePaths.misc.juzeAvatar
        };
      }
    } catch (err) {
      console.error('[control] 创建分享链失败:', err);
    }

    // 降级：使用原始 roomId
    return {
      title: this.data.roomTitle,
      path: `/package-vote/pages/vote/vote?roomId=${this.data.roomId}&shareFrom=1`,
      imageUrl: imagePaths.misc.juzeAvatar
    };
  },

  // 分享给朋友 - 支持从任意 button open-type=share 触发
  async onShareAppMessage(e) {
    const info = await this.getShareInfo();
    console.log('[control] 触发分享:', e?.from, e?.target?.dataset);

    // 异步记录分享事件（不阻塞分享流程）
    this.recordShareEvent('friend', e?.target?.dataset);

    return {
      title: `来投票：${info.title}`,
      path: info.path,
      imageUrl: info.imageUrl
    };
  },

  // 分享到朋友圈
  async onShareTimeline() {
    // 异步记录分享事件
    this.recordShareEvent('timeline');

    // 创建分享链
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'createShareChain',
        data: {
          targetId: this.data.roomId,
          type: 'room',
          expireHours: 24
        }
      });

      if (result && result.success) {
        return {
          title: `来喵不喵一起投票：${this.data.roomTitle}`,
          query: `shareCode=${result.shareCode}`,
          imageUrl: imagePaths.misc.juzeAvatar
        };
      }
    } catch (err) {
      console.error('[control] 创建分享链失败:', err);
    }

    // 降级
    return {
      title: `来喵不喵一起投票：${this.data.roomTitle}`,
      query: `roomId=${this.data.roomId}`,
      imageUrl: imagePaths.misc.juzeAvatar
    };
  },

  // 记录分享邀请事件（静默，不阻塞用户操作）
  recordShareEvent(shareType, dataset) {
    const roomId = this.data.roomId;
    if (!roomId || !wx.cloud) return;

    const source = (dataset && dataset.memberid) ? 'control_remind' : 'control_invite';

    wx.cloud.callFunction({
      name: 'recordShare',
      data: { roomId, shareType, source }
    }).then(res => {
      if (res.result && res.result.code === 0 && !res.result.duplicated) {
        console.log('[control] 分享记录成功:', shareType);
      }
    }).catch(err => {
      console.warn('[control] 分享记录失败（不影响分享）:', err);
    });
  },
});