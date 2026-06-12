const app = getApp();
const _rawCuisineCategories = getApp().globalData.cuisineCategories;
const cuisineCategories = Array.isArray(_rawCuisineCategories) ? _rawCuisineCategories : [];
const audioManager = getApp().globalData.audioManager;
const { withLock } = getApp().globalData.debounce;
const { checkContentWithToast } = require('../../../utils/contentSecurity');

const { imagePaths } = getApp().globalData;

Page({
  data: {
    imagePaths: {},
    room: {},
    posters: [],
    currentIndex: 0,
    mode: 'a',
    canUndo: false,
    tabooExpanded: false,
    selectedHardTaboos: [],
    hardTaboos: [
      { name: 'spicy', label: '辣', selected: false },
      { name: 'beef', label: '牛肉', selected: false },
      { name: 'mutton', label: '羊肉', selected: false },
      { name: 'seafood', label: '海鲜', selected: false },
      { name: 'fish', label: '鱼虾', selected: false },
      { name: 'organ', label: '内脏', selected: false },
      { name: 'intestine', label: '肥肠', selected: false },
      { name: 'cold', label: '生冷', selected: false },
      { name: 'sashimi', label: '刺身', selected: false },
      { name: 'coriander', label: '香菜', selected: false },
      { name: 'scallion', label: '葱', selected: false },
      { name: 'garlic', label: '蒜', selected: false },
      { name: 'celery', label: '芹菜', selected: false },
      { name: 'houttuynia', label: '折耳根', selected: false }
    ],
    categoryCards: [],
    categoryCurrentIndex: 0,
    selectedCategoryIds: [],
    subCategoryCards: [],
    visibleSubCategoryCards: [],
    subCategoryCurrentIndex: 0,
    subCategorySwiperCurrent: 0,
    selectedSubCategories: {},
    selectedSubCategoryNames: [],
    currentSubCategory: {},
    currentStep: 'category',
    timeType: 'departure',
    selectedTime: '',
    leaveReason: '',
    likedIndices: [],
    vetoedIndices: [],
    canSubmit: false,
    showGuide: false,
    // 爱心猫咪特效
    showLoveCat: false,
    loveCatIndex: -1,
    // swiper相关
    screenWidth: 375,
    // 滑动历史记录
    swipeHistory: [],
    // 密码相关
    showPasswordModal: false,
    inputPassword: '',
    needPassword: false,
    isJoining: false,
    // 海报分享相关
    showPosterModal: false,
    posterData: null,
    // 投票结果通知
    showVoteResult: false,
    voteResult: {},
    // 分享来源（谁分享的链接）
    shareFrom: '',
    // 只读模式（已参与用户查看自己的投票结果）
    isReadonly: false
  },

  async onLoad(options) {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    // 立即设置导航栏颜色，防止闪烁
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8',
      animation: {
        duration: 0,
        timingFunc: 'linear'
      }
    });

    // 解析参数：支持 roomId 直接传入或 shareCode 分享码
    let { roomId, shareFrom, shareCode, readonly } = options;

    // 只读模式
    if (readonly === '1' || readonly === 1 || readonly === true) {
      this.setData({ isReadonly: true });
    }

    // 如果传入的是 shareCode，先解析获取 roomId
    if (shareCode && !roomId) {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'getAllRooms',
          data: { shareCode, limit: 1 }
        });
        if (result && result.success && result.rooms && result.rooms.length > 0) {
          roomId = result.rooms[0].roomId;
          console.log('[vote] 通过 shareCode 解析到 roomId:', roomId);
          // 通过分享码进入，视为分享来源（绕过好友限制）
          shareFrom = shareFrom || '1';
        } else {
          wx.showToast({ title: '分享链接已过期', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
          return;
        }
      } catch (err) {
        console.error('[vote] 解析 shareCode 失败:', err);
        wx.showToast({ title: '链接解析失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }
    }

    this.setData({ roomId, shareFrom: shareFrom || '' });

    // 获取屏幕宽度
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenWidth: sysInfo.windowWidth
    });

    // 双击检测
    this.lastTap = 0;

    // 防抖：提交投票
    this._lockedDoSubmitVote = withLock(this.doSubmitVote.bind(this));

    // 先尝试恢复本地状态
    const hasRestored = this.restoreVoteState(roomId);
    if (!hasRestored) {
      this.loadRoomData(roomId);
    } else {
    }
    this._timers = [];
  },

  onShow() {
    // 页面显示时再次设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8',
      animation: {
        duration: 0,
        timingFunc: 'linear'
      }
    });
  },

  onReady() {
    // 页面准备好时再次设置导航栏颜色
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#F5F0E8',
      animation: {
        duration: 0,
        timingFunc: 'linear'
      }
    });
  },

  // 保存投票状态到本地
  saveVoteState() {
    const { roomId } = this.data;
    if (!roomId) return;

    const stateToSave = {
      roomId,
      mode: this.data.mode,
      currentStep: this.data.currentStep,
      // 模式A状态
      currentIndex: this.data.currentIndex,
      likedIndices: this.data.likedIndices,
      vetoedIndices: this.data.vetoedIndices,
      posters: this.data.posters,
      // 模式B状态
      categoryCards: this.data.categoryCards,
      selectedCategoryIds: this.data.selectedCategoryIds,
      subCategoryCards: this.data.subCategoryCards,
      selectedSubCategories: this.data.selectedSubCategories,
      selectedSubCategoryNames: this.data.selectedSubCategoryNames,
      categoryCurrentIndex: this.data.categoryCurrentIndex,
      subCategoryCurrentIndex: this.data.subCategoryCurrentIndex,
      // 禁忌和偏好
      hardTaboos: this.data.hardTaboos,
      selectedHardTaboos: this.data.selectedHardTaboos,
      tabooExpanded: this.data.tabooExpanded,
      // 时间和原因
      timeType: this.data.timeType,
      selectedTime: this.data.selectedTime,
      leaveReason: this.data.leaveReason,
      canSubmit: this.data.canSubmit,
      // 保存时间戳
      saveTime: Date.now()
    };

    wx.setStorageSync(`vote_state_${roomId}`, stateToSave);
  },

  // 恢复投票状态
  restoreVoteState(roomId) {
    if (!roomId) return false;

    // 暂时禁用自动恢复功能，每次进入都重新开始
    // 这样可以避免显示"已筛选完毕"的状态
    return false;

    /* 以下是原来的恢复逻辑，暂时注释掉
    const savedState = wx.getStorageSync(`vote_state_${roomId}`);
    if (!savedState) {
      return false;
    }

    // 检查状态是否过期（24小时）
    const now = Date.now();
    const saveTime = savedState.saveTime || 0;
    if (now - saveTime > 24 * 60 * 60 * 1000) {
      wx.removeStorageSync(`vote_state_${roomId}`);
      return false;
    }


    // 恢复状态
    this.setData({
      room: { _id: roomId, mode: savedState.mode },
      mode: savedState.mode,
      currentStep: savedState.currentStep || 'category',
      // 模式A
      currentIndex: savedState.currentIndex || 0,
      likedIndices: savedState.likedIndices || [],
      vetoedIndices: savedState.vetoedIndices || [],
      posters: savedState.posters || [],
      // 模式B
      categoryCards: savedState.categoryCards || [],
      selectedCategoryIds: savedState.selectedCategoryIds || [],
      subCategoryCards: savedState.subCategoryCards || [],
      selectedSubCategories: savedState.selectedSubCategories || {},
      selectedSubCategoryNames: savedState.selectedSubCategoryNames || [],
      categoryCurrentIndex: savedState.categoryCurrentIndex || 0,
      subCategoryCurrentIndex: savedState.subCategoryCurrentIndex || 0,
      // 禁忌和偏好
      hardTaboos: savedState.hardTaboos || this.data.hardTaboos,
      selectedHardTaboos: savedState.selectedHardTaboos || [],
      tabooExpanded: savedState.tabooExpanded || false,
      // 时间和原因
      timeType: savedState.timeType || 'departure',
      selectedTime: savedState.selectedTime || '',
      leaveReason: savedState.leaveReason || '',
      canSubmit: savedState.canSubmit || false
    });

    wx.showToast({
      title: '已恢复上次填写',
      icon: 'none',
      duration: 2000
    });

    return true;
    */
  },

  // 清除投票状态
  clearVoteState(roomId) {
    if (!roomId) return;
    wx.removeStorageSync(`vote_state_${roomId}`);
  },

  onUnload() {
    // 清理所有定时器，防止内存泄漏
    if (this._timers && this._timers.length > 0) {
      this._timers.forEach(t => clearTimeout(t));
      this._timers = [];
    }
  },

  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });
      
      // 模拟数据处理
      if (roomId === 'mock_ready_001') {
        // 模拟：投票已完成，可以查看结果
        const mockRoom = {
          _id: 'mock_ready_001',
          title: '🍔 我选好了',
          mode: 'a',
          status: 'locked',
          isCreator: false,
          isParticipant: true,
          hasJoinedGroupOrder: true,
          candidatePosters: [
            {
              _id: 'p1',
              shopName: '麦当劳（人民路店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=McDonalds%20restaurant%20exterior%20with%20golden%20arches%20logo%20blue%20sky&image_size=landscape_4_3',
              platformSource: 'meituan',
              votePercent: 67
            },
            {
              _id: 'p2',
              shopName: '肯德基（中心广场店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=KFC%20restaurant%20exterior%20with%20red%20sign%20building&image_size=landscape_4_3',
              platformSource: 'meituan',
              votePercent: 33
            },
            {
              _id: 'p3',
              shopName: '汉堡王（商业街店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Burger%20King%20restaurant%20exterior%20with%20flame%20grill%20sign&image_size=landscape_4_3',
              platformSource: 'meituan',
              votePercent: 0
            }
          ],
          totalVoters: 3,
          finalPoster: {
            name: '麦当劳（人民路店）',
            imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=McDonalds%20restaurant%20exterior%20with%20golden%20arches%20logo%20blue%20sky&image_size=landscape_4_3',
            platformSource: 'meituan',
            time: '今天 12:00',
            votePercent: 67
          }
        };
        this._handleMockRoom(mockRoom);
        wx.hideLoading();
        return;
      }

      if (roomId === 'mock_pending_001') {
        // 模拟：待投票状态，可以参与投票
        const mockRoom = {
          _id: 'mock_pending_001',
          title: '🍕 你们来定',
          mode: 'a',
          status: 'voting',
          isCreator: false,
          isParticipant: false,
          hasJoinedGroupOrder: false,
          candidatePosters: [
            {
              _id: 'p1',
              shopName: '必胜客（万达店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Pizza%20Hut%20restaurant%20interior%20with%20pizza%20on%20table&image_size=landscape_4_3',
              platformSource: 'meituan',
              voteCount: 2
            },
            {
              _id: 'p2',
              shopName: '棒约翰（银泰店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=pizza%20restaurant%20with%20delicious%20pizza%20and%20salad&image_size=landscape_4_3',
              platformSource: 'meituan',
              voteCount: 1
            },
            {
              _id: 'p3',
              shopName: '达美乐（凯德店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Domino%20pizza%20delivery%20box%20with%20fresh%20pizza&image_size=landscape_4_3',
              platformSource: 'meituan',
              voteCount: 0
            },
            {
              _id: 'p4',
              shopName: '乐凯撒（海岸城店）',
              imageUrl: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=casual%20pizza%20restaurant%20with%20wood%20fired%20oven&image_size=landscape_4_3',
              platformSource: 'meituan',
              voteCount: 1
            }
          ],
          totalVoters: 4
        };
        this._handleMockRoom(mockRoom);
        wx.hideLoading();
        return;
      }

      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: {
          roomId,
          // 任何非空的 shareFrom 值都视为来自分享链接（包括 openId、'1' 等）
          isFromShare: !!this.data.shareFrom
        }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      let room = result.data;

      // 检查是否需要密码且未加入
      if (room.needPassword && !room.isParticipant && !room.isCreator) {
        this.setData({
          showPasswordModal: true,
          needPassword: true,
          roomId: roomId,
          room: room
        });
        wx.hideLoading();
        return;
      }

      // 无密码房间：如果尚未加入，自动加入（携带分享来源）
      if (!room.isParticipant && !room.isCreator) {
        try {
          await wx.cloud.callFunction({
            name: 'joinRoom',
            data: {
              roomId,
              shareFrom: this.data.shareFrom || ''
            }
          });
          console.log('[vote] 无密码房间自动加入成功，重新加载房间数据');
          // 加入成功后重新获取完整房间数据（包含 isParticipant=true 和完整 posters）
          const { result: refreshResult } = await wx.cloud.callFunction({
            name: 'getRoom',
            data: {
              roomId,
              isFromShare: !!this.data.shareFrom
            }
          });
          if (refreshResult.code === 0) {
            room = refreshResult.data;
            console.log('[vote] 重新加载房间数据成功，isParticipant:', room.isParticipant);
          }
        } catch (joinErr) {
          console.warn('[vote] 无密码房间自动加入失败（仍可继续浏览）:', joinErr);
          // 不阻塞用户浏览，仅记录日志
        }
      }

      // 兼容旧数据：通过 mode 字段 + 数据特征双重判断
      // 旧 Mode A 活动可能被错误存储为 mode='pick_for_them'
      // 通过 candidatePosters（Mode A 特有）和 cuisineOptions（Mode B 特有）来辅助判断
      const rawMode = room.mode || 'a';
      const hasCandidatePosters = !!(room.candidatePosters && room.candidatePosters.length > 0);
      const hasCuisineOptions = !!room.cuisineOptions;

      let mode;
      if (rawMode === 'b') {
        // 明确的 Mode B
        mode = 'b';
      } else if (rawMode === 'a') {
        // 明确的 Mode A
        mode = 'a';
      } else if (rawMode === 'pick_for_them') {
        // 旧数据：需要根据实际内容判断
        if (hasCuisineOptions && !hasCandidatePosters) {
          // 有菜系选项但没有候选海报 → 真正的 Mode B
          mode = 'b';
          console.log('[vote] 旧数据 pick_for_them → 判定为 Mode B（有cuisineOptions无candidatePosters）');
        } else if (hasCandidatePosters) {
          // 有候选海报 → 实际是 Mode A（被错误标记为 pick_for_them）
          mode = 'a';
          console.log('[vote] 旧数据 pick_for_them → 兼容修正为 Mode A（有candidatePosters）');
        } else {
          // 无法判断，默认按 Mode A 处理（因为 pick_for_them 原本是 create-mode-b 的值）
          mode = 'b';
          console.log('[vote] 旧数据 pick_for_them → 默认判定为 Mode B（无明确特征）');
        }
      } else {
        mode = 'a'; // 默认 Mode A
      }

      console.log('[vote] room.mode:', JSON.stringify(room.mode), 'rawMode:', rawMode, '最终判断:', mode,
        'hasCandidatePosters:', hasCandidatePosters, 'hasCuisineOptions:', hasCuisineOptions);

      if (mode === 'b') {
        const categoryCards = cuisineCategories.map((cat, index) => ({
          ...cat,
          index,
          status: '',
          isVetoed: false,
          isSelected: false
        }));

        this.setData({
          room,
          mode: 'b',
          categoryCards,
          currentStep: 'category',
          selectedCategoryIds: [],
          selectedSubCategories: {},
          posters: [],
          currentIndex: 0,
          categoryCurrentIndex: 0,
          subCategoryCurrentIndex: 0
        });
      } else {
        const candidatePosters = room.candidatePosters || [];
        if (candidatePosters.length > 0) {
        }

        const posters = candidatePosters.map((p, index) => ({
          ...p,
          index,
          status: '',
          isVetoed: false,
          isLiked: false,
          isFav: false
        }));


        this.setData({
          room,
          mode: 'a',
          posters,
          currentIndex: 0,
          categoryCurrentIndex: 0,
          subCategoryCurrentIndex: 0
        }, () => {
        });
      }

      // 只读模式：恢复用户已提交的投票状态
      // 如果服务端返回了 myVoteDetail，说明用户已投过票，自动进入只读模式
      if (room.myVoteDetail && !this.data.isReadonly) {
        console.log('[vote] 检测到用户已投票，自动切换到只读模式');
        this.setData({ isReadonly: true });
      }
      if (this.data.isReadonly && room.myVoteDetail) {
        this._applyReadonlyState(room);
      }

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 只读模式：恢复用户已提交的投票状态到UI
  _applyReadonlyState(room) {
    const detail = room.myVoteDetail;
    if (!detail) return;

    if (this.data.mode === 'a') {
      // Mode A: 恢复 liked/vetoed 状态
      const posters = this.data.posters.map((p, index) => ({
        ...p,
        isLiked: detail.likedIndices.includes(index),
        isVetoed: detail.vetoedIndices.includes(index)
      }));
      // 跳到最后一张已操作的卡片，或保持第一张
      const lastLikedIndex = detail.likedIndices.length > 0
        ? Math.max(...detail.likedIndices)
        : (detail.vetoedIndices.length > 0 ? Math.max(...detail.vetoedIndices) : 0);
      this.setData({
        posters,
        currentIndex: Math.min(lastLikedIndex + 1, posters.length - 1),
        likedIndices: detail.likedIndices || [],
        vetoedIndices: detail.vetoedIndices || []
      });
    } else if (this.data.mode === 'b') {
      // Mode B: 恢复分类选择状态
      const categoryCards = this.data.categoryCards.map(cat => ({
        ...cat,
        isSelected: detail.selectedCategoryIds.includes(cat.id || cat.index)
      }));
      this.setData({
        categoryCards,
        selectedCategoryIds: detail.selectedCategoryIds || [],
        selectedSubCategories: detail.selectedSubCategories || {},
        selectedHardTaboos: detail.selectedHardTaboos || []
      });
      // 如果已选了大类，进入细类选择步骤
      if (detail.selectedCategoryIds && detail.selectedCategoryIds.length > 0) {
        this.setData({ currentStep: 'subcategory' });
      }
    }

    console.log('[vote] 已恢复只读投票状态', detail);
  },

  // 退出只读模式，允许编辑修改投票
  enableEdit() {
    this.setData({ isReadonly: false });
    console.log('[vote] 已退出只读模式，可编辑');
  },

  // 处理模拟房间数据
  _handleMockRoom(room) {
    const mode = room.mode || 'a';
    
    if (room.status === 'locked' && room.finalPoster) {
      // 投票已结束，有结果，直接跳转到结果页
      setTimeout(() => {
        wx.redirectTo({
          url: `/package-vote/pages/result/result?roomId=${room._id}`
        });
      }, 500);
      return;
    }
    
    if (mode === 'b') {
      const categoryCards = cuisineCategories.map((cat, index) => ({
        ...cat,
        index,
        status: '',
        isVetoed: false,
        isSelected: false
      }));

      this.setData({
        room,
        mode: 'b',
        categoryCards,
        currentStep: 'category',
        selectedCategoryIds: [],
        selectedSubCategories: {},
        posters: [],
        currentIndex: 0,
        categoryCurrentIndex: 0,
        subCategoryCurrentIndex: 0
      });
    } else {
      const candidatePosters = room.candidatePosters || [];
      
      const posters = candidatePosters.map((p, index) => ({
        ...p,
        index,
        status: '',
        isVetoed: false,
        isLiked: false,
        isFav: false
      }));

      this.setData({
        room,
        mode: 'a',
        posters,
        currentIndex: 0,
        categoryCurrentIndex: 0,
        subCategoryCurrentIndex: 0
      });
    }
  },

  // ========== 密码相关方法 ==========
  onPasswordInput(e) {
    this.setData({ inputPassword: e.detail.value });
  },

  async submitPassword() {
    const { inputPassword, roomId, isJoining } = this.data;

    if (inputPassword.length < 4) {
      wx.showToast({ title: '密码至少4位', icon: 'none' });
      return;
    }

    if (isJoining) return;
    this.setData({ isJoining: true });

    wx.showLoading({ title: '加入中...' });

    try {
      // 调用 joinRoom 云函数，传入密码和分享来源
      const { result } = await wx.cloud.callFunction({
        name: 'joinRoom',
        data: {
          roomId,
          password: inputPassword,
          shareFrom: this.data.shareFrom || ''
        }
      });

      wx.hideLoading();
      this.setData({ isJoining: false });

      if (result.code === 0 || result.msg === '您已在该房间中') {
        // 加入成功 或 已在房间中：关闭密码弹窗并重新加载房间数据
        this.setData({
          showPasswordModal: false,
          inputPassword: ''
        });
        wx.showToast({ title: result.code === 0 ? '加入成功' : '欢迎回来', icon: 'success' });
        // 重新加载房间数据（确保拿到完整的参与者状态和海报数据）
        const pwTimer = setTimeout(() => {
          this.loadRoomData(roomId);
        }, 1000);
        this._timers = this._timers || [];
        this._timers.push(pwTimer);
      } else {
        wx.showToast({ title: result.msg || '加入失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ isJoining: false });
      wx.showToast({ title: err.message || '加入失败', icon: 'none' });
    }
  },

  // ========== Mode A: swiper切换事件 ==========
  onCardChange(e) {
    const newIndex = e.detail.current;
    const oldIndex = this.data.currentIndex;

    // 记录滑动历史
    if (newIndex > oldIndex) {
      // 上滑 - 跳过/不喜欢（只在未选择状态下）
      const { posters } = this.data;

      if (oldIndex >= posters.length) {
        this.setData({ currentIndex: newIndex });
        return;
      }

      const oldPoster = posters[oldIndex];

      // 如果之前没有选择过（既不喜欢也不否决），才标记为否决
      if (oldPoster && !oldPoster.isLiked && !oldPoster.isVetoed) {
        this.recordSwipeHistory(-1, oldIndex);
        const { vetoedIndices } = this.data;
        const newVetoed = [...vetoedIndices, oldIndex];
        const newPosters = [...posters];
        newPosters[oldIndex] = { ...newPosters[oldIndex], isVetoed: true };

        this.setData({
          currentIndex: newIndex,
          vetoedIndices: newVetoed,
          posters: newPosters,
          canUndo: true
        });
      } else {
        // 已经选择过了，只是翻页
        this.setData({
          currentIndex: newIndex
        });
      }
    } else if (newIndex < oldIndex) {
      // 下滑 - 返回上一张，保持原有状态
      this.setData({
        currentIndex: newIndex
      });
    }

    this.updateCanSubmit();
  },

  // 双击喜欢
  onTapCard(e) {
    const now = Date.now();
    const index = e.currentTarget.dataset.index;
    
    if (this.lastTap && now - this.lastTap < 300) {
      // 双击触发
      this.toggleLikeByIndex(index);
    }
    this.lastTap = now;
  },

  toggleLike(e) {
    const index = e.currentTarget.dataset.index;
    this.toggleLikeByIndex(index);
  },

  toggleLikeByIndex(index) {
    const { posters, vetoedIndices } = this.data;
    const poster = posters[index];
    const isLiked = poster.isLiked;

    let newVetoedIndices = vetoedIndices;

    // 更新posters数组中的isLiked状态，同时清除否决状态
    const newPosters = posters.map((p, i) => {
      if (i === index) {
        // 如果喜欢，清除否决状态
        if (!isLiked) {
          newVetoedIndices = vetoedIndices.filter(v => v !== index);
        }
        return { ...p, isLiked: !isLiked, isVetoed: false };
      }
      return p;
    });

    this.setData({
      posters: newPosters,
      vetoedIndices: newVetoedIndices,
      canSubmit: true,
      showLoveCat: !isLiked,
      loveCatIndex: index
    });

    // 播放猫咪音效
    if (!isLiked) {
      audioManager.playKittenMeow();
    } else {
      audioManager.playPawTap();
    }

    wx.showToast({
      title: isLiked ? '取消选择' : '想要喵',
      icon: 'success'
    });

    // 3秒后隐藏爱心猫咪
    if (!isLiked) {
      const loveTimer = setTimeout(() => {
        this.setData({
          showLoveCat: false,
          loveCatIndex: -1
        });
      }, 3000);
      this._timers = this._timers || [];
      this._timers.push(loveTimer);
    }

    this.updateCanSubmit();
  },

  // 重置选择
  resetChoice(e) {
    const index = e.currentTarget.dataset.index;
    const { posters, vetoedIndices } = this.data;

    // 清除当前卡片的选择状态
    const newPosters = posters.map((p, i) =>
      i === index ? { ...p, isLiked: false, isVetoed: false } : p
    );

    // 从否决列表中移除
    const newVetoedIndices = vetoedIndices.filter(v => v !== index);

    this.setData({
      posters: newPosters,
      vetoedIndices: newVetoedIndices
    });

    wx.showToast({
      title: '已重置',
      icon: 'success'
    });

    this.updateCanSubmit();
  },

  // 收藏/取消收藏店铺（保存到"我的"）
  toggleFav(e) {
    const index = e.currentTarget.dataset.index;
    const { posters } = this.data;
    const poster = posters[index];
    const isFav = poster.isFav;

    // 更新收藏状态
    const newPosters = posters.map((p, i) =>
      i === index ? { ...p, isFav: !isFav } : p
    );

    this.setData({
      posters: newPosters
    });

    // 保存到本地存储
    let myFavs = wx.getStorageSync('my_favorites') || [];
    if (!isFav) {
      // 添加收藏
      myFavs.push({
        index: poster.index,
        shopName: poster.shopName,
        imageUrl: poster.imageUrl,
        platformSource: poster.platformSource,
        favTime: Date.now()
      });
      wx.showToast({
        title: '已收藏到"我的"',
        icon: 'success'
      });
    } else {
      // 取消收藏
      myFavs = myFavs.filter(f => f.index !== poster.index);
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    }
    wx.setStorageSync('my_favorites', myFavs);
  },

  onSkip(e) {
    const index = e.currentTarget.dataset.index;
    const { posters } = this.data;

    // 如果已经是最后一张，显示提示
    if (index >= posters.length - 1) {
      wx.showToast({ title: '已经是最后一张了', icon: 'none' });
      return;
    }

    // 跳到下一张
    this.setData({
      currentIndex: index + 1
    });

    wx.showToast({ title: '已跳过', icon: 'none' });
  },

  // 上一张
  onPrev(e) {
    const index = e.currentTarget.dataset.index;

    if (index <= 0) {
      wx.showToast({ title: '已经是第一张了', icon: 'none' });
      return;
    }

    this.setData({
      currentIndex: index - 1
    });
  },

  // 下一张
  onNext(e) {
    const index = e.currentTarget.dataset.index;
    const { posters } = this.data;

    if (index >= posters.length - 1) {
      wx.showToast({ title: '已经是最后一张了', icon: 'none' });
      return;
    }

    // 标记为跳过
    const { vetoedIndices } = this.data;
    const newVetoed = [...vetoedIndices, index];
    const newPosters = [...this.data.posters];
    newPosters[index] = { ...newPosters[index], isVetoed: true };

    this.setData({
      currentIndex: index + 1,
      vetoedIndices: newVetoed,
      posters: newPosters,
      canUndo: true
    });

    this.recordSwipeHistory(-1, index);
    this.updateCanSubmit();
  },

  // ========== Mode B: 大类选择 ==========
  onCategoryChange(e) {
    const newIndex = e.detail.current;
    const oldIndex = this.data.categoryCurrentIndex;

    if (newIndex > oldIndex) {
      // 上滑 - 跳过（只在未选择状态下）
      const { categoryCards } = this.data;
      const oldCategory = categoryCards[oldIndex];

      if (!oldCategory.isSelected) {
        this.recordSwipeHistory(-1, oldIndex, 'category');
        this.setData({
          categoryCurrentIndex: newIndex,
          canUndo: true
        });
      } else {
        this.setData({
          categoryCurrentIndex: newIndex
        });
      }
    } else {
      this.setData({
        categoryCurrentIndex: newIndex
      });
    }
  },

  // 双击检测 - 大类
  onCategoryTap(e) {
    const now = Date.now();
    const index = e.currentTarget.dataset.index;

    if (this.lastCategoryTap && now - this.lastCategoryTap < 300) {
      // 双击触发
      this.toggleCategoryLikeByIndex(index);
    }
    this.lastCategoryTap = now;
  },

  toggleCategoryLike(e) {
    const index = e.currentTarget.dataset.index;
    this.toggleCategoryLikeByIndex(index);
  },

  // 网格选择 - 大类
  toggleCategoryGridSelect(e) {
    const index = e.currentTarget.dataset.index;
    const { categoryCards, selectedCategoryIds } = this.data;
    const category = categoryCards[index];
    const isSelected = category.isSelected;

    if (isSelected) {
      // 取消选择
      const newSelected = selectedCategoryIds.filter(c => c.id !== category.id);
      const newCategoryCards = categoryCards.map((c, i) =>
        i === index ? { ...c, isSelected: false } : c
      );

      this.setData({
        selectedCategoryIds: newSelected,
        categoryCards: newCategoryCards,
        canSubmit: newSelected.length > 0
      });

      // 保存状态
      this.saveVoteState();
    } else {
      // 选择（最多3个）
      if (selectedCategoryIds.length >= 3) {
        wx.showToast({ title: '最多选择3个', icon: 'none' });
        return;
      }

      const newSelected = [...selectedCategoryIds, { id: category.id, name: category.name, color: category.color }];
      const newCategoryCards = categoryCards.map((c, i) =>
        i === index ? { ...c, isSelected: true } : c
      );

      this.setData({
        selectedCategoryIds: newSelected,
        categoryCards: newCategoryCards,
        canSubmit: true
      });

      // 保存状态
      this.saveVoteState();
    }
  },

  toggleCategoryLikeByIndex(index) {
    const { categoryCards, selectedCategoryIds } = this.data;
    const category = categoryCards[index];

    const isSelected = category.isSelected;

    let newSelected;
    let newCategoryCards;

    if (isSelected) {
      newSelected = selectedCategoryIds.filter(c => c.id !== category.id);
      newCategoryCards = categoryCards.map((c, i) =>
        i === index ? { ...c, isSelected: false } : c
      );
    } else {
      if (selectedCategoryIds.length >= 3) {
        wx.showToast({ title: '最多选择3个', icon: 'none' });
        return;
      }
      newSelected = [...selectedCategoryIds, { id: category.id, name: category.name }];
      newCategoryCards = categoryCards.map((c, i) =>
        i === index ? { ...c, isSelected: true } : c
      );
    }

    this.setData({
      selectedCategoryIds: newSelected,
      categoryCards: newCategoryCards,
      canSubmit: newSelected.length > 0
    });

    wx.showToast({
      title: isSelected ? '取消选择' : '已选择',
      icon: 'success'
    });
  },

  // 大类收藏
  toggleCategoryFav(e) {
    const index = e.currentTarget.dataset.index;
    const { categoryCards } = this.data;
    const category = categoryCards[index];
    const isFav = category.isFav;

    const newCategoryCards = categoryCards.map((c, i) =>
      i === index ? { ...c, isFav: !isFav } : c
    );

    this.setData({
      categoryCards: newCategoryCards
    });

    wx.showToast({
      title: isFav ? '已取消收藏' : '已收藏',
      icon: 'success'
    });
  },

  // 重置大类选择
  resetCategoryChoice(e) {
    const index = e.currentTarget.dataset.index;
    const { categoryCards, selectedCategoryIds } = this.data;
    const category = categoryCards[index];

    const newSelected = selectedCategoryIds.filter(c => c.id !== category.id);
    const newCategoryCards = categoryCards.map((c, i) =>
      i === index ? { ...c, isSelected: false } : c
    );

    this.setData({
      selectedCategoryIds: newSelected,
      categoryCards: newCategoryCards,
      canSubmit: newSelected.length > 0
    });

    wx.showToast({
      title: '已重置',
      icon: 'success'
    });
  },

  onCategorySkip(e) {
    const index = e.currentTarget.dataset.index;
    const { categoryCards } = this.data;

    if (index >= categoryCards.length - 1) {
      wx.showToast({ title: '已经是最后一个了', icon: 'none' });
      return;
    }

    this.setData({
      categoryCurrentIndex: index + 1
    });

    wx.showToast({ title: '已跳过', icon: 'none' });
  },

  // 大类选择 - 上一个
  onCategoryPrev(e) {
    const index = e.currentTarget.dataset.index;

    if (index <= 0) {
      wx.showToast({ title: '已经是第一个了', icon: 'none' });
      return;
    }

    this.setData({
      categoryCurrentIndex: index - 1
    });
  },

  // 大类选择 - 下一个
  onCategoryNext(e) {
    const index = e.currentTarget.dataset.index;
    const { categoryCards } = this.data;

    if (index >= categoryCards.length - 1) {
      wx.showToast({ title: '已经是最后一个了', icon: 'none' });
      return;
    }

    this.recordSwipeHistory(-1, index, 'category');
    this.setData({
      categoryCurrentIndex: index + 1,
      canUndo: true
    });
  },

  // ========== Mode B: 细类选择 ==========
  onSubCategoryChange(e) {
    const swiperCurrent = e.detail.current;
    const { visibleSubCategoryCards } = this.data;
    
    // 根据 swiper 的 current 找到对应的细类
    const currentSubCategory = visibleSubCategoryCards[swiperCurrent] || {};

    this.setData({
      subCategorySwiperCurrent: swiperCurrent,
      subCategoryCurrentIndex: currentSubCategory.index || 0,
      currentSubCategory
    });
  },

  // 切换当前细类的喜欢状态
  toggleCurrentSubCategoryLike() {
    const { subCategorySwiperCurrent } = this.data;
    this.toggleSubCategoryLikeByIndex(subCategorySwiperCurrent);
  },

  // 双击检测 - 细类
  onSubCategoryTap(e) {
    const now = Date.now();
    const index = e.currentTarget.dataset.index;

    if (this.lastSubCategoryTap && now - this.lastSubCategoryTap < 300) {
      // 双击触发
      this.toggleSubCategoryLikeByIndex(index);
    }
    this.lastSubCategoryTap = now;
  },

  toggleSubCategoryLike(e) {
    const index = e.currentTarget.dataset.index;
    this.toggleSubCategoryLikeByIndex(index);
  },

  toggleSubCategoryLikeByIndex(visibleIndex) {
    const { visibleSubCategoryCards, subCategoryCards, selectedSubCategories } = this.data;
    
    // 从可见列表中获取当前细类
    const sub = visibleSubCategoryCards[visibleIndex];
    if (!sub) return;

    // 确保 categoryId 是字符串
    const categoryId = String(sub.categoryId);
    const currentSelected = selectedSubCategories[categoryId] || [];
    const isSelected = sub.isSelected;

    // 创建新的 selectedSubCategories 对象副本
    const newSelectedSubCategories = { ...selectedSubCategories };

    let newSelectedForCategory;
    let newSubCategoryCards;

    if (isSelected) {
      // 取消选择：恢复显示该大类下的所有细类
      newSelectedForCategory = [];
      newSubCategoryCards = subCategoryCards.map(s =>
        String(s.categoryId) === categoryId ? { ...s, isSelected: false, isHidden: false } : s
      );
    } else {
      // 选择：只保留当前选中的，隐藏同大类的其他细类
      newSelectedForCategory = [sub.name];
      newSubCategoryCards = subCategoryCards.map(s => {
        if (String(s.categoryId) === categoryId) {
          // 同大类：当前选中项显示，其他隐藏
          return { ...s, isSelected: s.index === sub.index, isHidden: s.index !== sub.index };
        }
        return s;
      });
    }

    newSelectedSubCategories[categoryId] = newSelectedForCategory;

    // 更新已选细类名称列表 - 从所有已选大类中收集
    const selectedSubCategoryNames = [];
    Object.keys(newSelectedSubCategories).forEach(catId => {
      const selectedNames = newSelectedSubCategories[catId];
      if (selectedNames && selectedNames.length > 0) {
        selectedSubCategoryNames.push(...selectedNames);
      }
    });


    // 更新可见列表
    const newVisibleSubCategoryCards = newSubCategoryCards.filter(s => !s.isHidden);
    
    // 找到当前选中项在可见列表中的位置
    let newSwiperCurrent = newVisibleSubCategoryCards.findIndex(s => s.index === sub.index);
    
    // 自动跳转逻辑：如果当前是选择操作（不是取消），且当前大类已选完
    // 则跳转到下一个大类的第一个未选细类
    if (!isSelected && newVisibleSubCategoryCards.length > 0) {
      // 获取当前大类在可见列表中的范围
      const currentCategoryItems = newVisibleSubCategoryCards.filter(s => String(s.categoryId) === categoryId);
      const currentCategoryHasMore = currentCategoryItems.some(s => !s.isSelected);
      
      // 如果当前大类没有更多未选项，找下一个大类的第一项
      if (!currentCategoryHasMore) {
        // 找到当前位置之后的第一个不同大类的细类
        const nextCategoryIndex = newVisibleSubCategoryCards.findIndex((s, idx) => {
          return idx > newSwiperCurrent && String(s.categoryId) !== categoryId;
        });
        if (nextCategoryIndex >= 0) {
          newSwiperCurrent = nextCategoryIndex;
        }
      }
    }

    this.setData({
      selectedSubCategories: newSelectedSubCategories,
      subCategoryCards: newSubCategoryCards,
      visibleSubCategoryCards: newVisibleSubCategoryCards,
      subCategorySwiperCurrent: newSwiperCurrent >= 0 ? newSwiperCurrent : 0,
      selectedSubCategoryNames
    });

    // 保存状态
    this.saveVoteState();
  },

  // 细类收藏
  toggleSubCategoryFav(e) {
    const visibleIndex = e.currentTarget.dataset.index;
    const { visibleSubCategoryCards, subCategoryCards } = this.data;
    const sub = visibleSubCategoryCards[visibleIndex];
    if (!sub) return;
    
    const isFav = sub.isFav;

    const newSubCategoryCards = subCategoryCards.map(s =>
      s.index === sub.index ? { ...s, isFav: !isFav } : s
    );

    const newVisibleSubCategoryCards = newSubCategoryCards.filter(s => !s.isHidden);

    this.setData({
      subCategoryCards: newSubCategoryCards,
      visibleSubCategoryCards: newVisibleSubCategoryCards
    });

    wx.showToast({
      title: isFav ? '已取消收藏' : '已收藏',
      icon: 'success'
    });
  },

  // 重置细类选择
  resetSubCategoryChoice(e) {
    const visibleIndex = e.currentTarget.dataset.index;
    const { visibleSubCategoryCards, subCategoryCards, selectedSubCategories } = this.data;
    const sub = visibleSubCategoryCards[visibleIndex];
    if (!sub) return;

    const categoryId = String(sub.categoryId);
    const currentSelected = selectedSubCategories[categoryId] || [];
    const newSelectedForCategory = currentSelected.filter(name => name !== sub.name);

    const newSelectedSubCategories = { ...selectedSubCategories };
    newSelectedSubCategories[categoryId] = newSelectedForCategory;

    // 恢复该大类下的所有细类显示
    const newSubCategoryCards = subCategoryCards.map(s =>
      String(s.categoryId) === categoryId ? { ...s, isSelected: false, isHidden: false } : s
    );

    const newVisibleSubCategoryCards = newSubCategoryCards.filter(s => !s.isHidden);

    // 更新已选细类名称列表
    const selectedSubCategoryNames = [];
    Object.keys(newSelectedSubCategories).forEach(catId => {
      const selectedNames = newSelectedSubCategories[catId];
      if (selectedNames && selectedNames.length > 0) {
        selectedSubCategoryNames.push(...selectedNames);
      }
    });

    this.setData({
      selectedSubCategories: newSelectedSubCategories,
      subCategoryCards: newSubCategoryCards,
      visibleSubCategoryCards: newVisibleSubCategoryCards,
      selectedSubCategoryNames
    });

    wx.showToast({
      title: '已重置',
      icon: 'success'
    });
  },

  onSubCategorySkip(e) {
    const { subCategorySwiperCurrent, visibleSubCategoryCards } = this.data;

    if (subCategorySwiperCurrent >= visibleSubCategoryCards.length - 1) {
      wx.showToast({ title: '已经是最后一个了', icon: 'none' });
      return;
    }

    this.setData({
      subCategorySwiperCurrent: subCategorySwiperCurrent + 1
    });

    wx.showToast({ title: '已跳过', icon: 'none' });
  },

  // 细类选择 - 上一个
  onSubCategoryPrev(e) {
    const index = e.currentTarget.dataset.index;

    if (index <= 0) {
      wx.showToast({ title: '已经是第一个了', icon: 'none' });
      return;
    }

    this.setData({
      subCategoryCurrentIndex: index - 1
    });
  },

  // 细类选择 - 下一个
  onSubCategoryNext(e) {
    const index = e.currentTarget.dataset.index;
    const { subCategoryCards } = this.data;

    if (index >= subCategoryCards.length - 1) {
      wx.showToast({ title: '已经是最后一个了', icon: 'none' });
      return;
    }

    this.recordSwipeHistory(-1, index, 'subcategory');
    this.setData({
      subCategoryCurrentIndex: index + 1,
      canUndo: true
    });
  },

  // ========== 通用方法 ==========
  recordSwipeHistory(direction, index, step) {
    const { mode, currentStep, likedIndices, vetoedIndices, selectedCategoryIds } = this.data;
    
    const historyItem = {
      mode,
      currentStep: step || currentStep,
      index,
      direction,
      likedIndices: [...likedIndices],
      vetoedIndices: [...vetoedIndices],
      selectedCategoryIds: [...selectedCategoryIds]
    };
    
    const swipeHistory = [...this.data.swipeHistory, historyItem];
    this.setData({ swipeHistory });
  },

  updateCanSubmit() {
    const { mode, posters, vetoedIndices, selectedCategoryIds } = this.data;
    let canSubmit = false;
    if (mode === 'a') {
      const hasLiked = posters.some(p => p.isLiked);
      canSubmit = hasLiked || vetoedIndices.length > 0;
    } else if (mode === 'b') {
      canSubmit = selectedCategoryIds.length > 0;
    }
    this.setData({ canSubmit });
  },

  undoLast() {
    const { swipeHistory, mode, currentStep } = this.data;
    if (swipeHistory.length === 0) return;

    const lastAction = swipeHistory[swipeHistory.length - 1];
    const newHistory = swipeHistory.slice(0, -1);

    const updateData = {
      swipeHistory: newHistory,
      canUndo: newHistory.length > 0,
      vetoedIndices: lastAction.vetoedIndices,
      selectedCategoryIds: lastAction.selectedCategoryIds
    };

    if (mode === 'a') {
      updateData.currentIndex = lastAction.index;
      const newPosters = [...this.data.posters];
      if (newPosters[lastAction.index]) {
        // 恢复否决状态和喜欢状态
        newPosters[lastAction.index] = {
          ...newPosters[lastAction.index],
          isVetoed: false,
          isLiked: lastAction.likedIndices.includes(lastAction.index)
        };
        updateData.posters = newPosters;
      }
    } else if (mode === 'b') {
      if (currentStep === 'category') {
        updateData.categoryCurrentIndex = lastAction.index;
      } else {
        updateData.subCategoryCurrentIndex = lastAction.index;
      }
    }

    this.setData(updateData);
    this.updateCanSubmit();

    wx.showToast({ title: '已撤销', icon: 'success' });
  },

  previewPoster(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.posters.map(p => p.imageUrl),
      current: url
    });
  },

  toggleTaboo() {
    this.setData({ tabooExpanded: !this.data.tabooExpanded });
    this.saveVoteState();
  },

  toggleHardTaboo(e) {
    const { name } = e.currentTarget.dataset;
    const hardTaboos = this.data.hardTaboos.map(item => {
      if (item.name === name) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });

    const selectedHardTaboos = hardTaboos.filter(i => i.selected).map(i => i.name);
    this.setData({ hardTaboos, selectedHardTaboos });
    this.saveVoteState();
  },

  switchTimeType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ timeType: type });
    this.saveVoteState();
  },

  onLeaveReasonInput(e) {
    this.setData({ leaveReason: e.detail.value });
    this.saveVoteState();
  },

  waiveVote() {
    wx.showModal({
      title: '确认弃权',
      content: '确定要放弃本次投票吗？',
      success: async (res) => {
        if (res.confirm) {
          // 弃权时如果填写了请假原因，也需要检查
          const { timeType, leaveReason } = this.data;
          if (timeType === 'leave' && leaveReason && leaveReason.trim()) {
            const isContentSafe = await checkContentWithToast(leaveReason.trim());
            if (!isContentSafe) {
              return;
            }
          }
          this._lockedDoSubmitVote({
            posterIndices: [],
            vetoIndices: [],
            cuisinePreferences: [],
            status: 'waived'
          });
        }
      }
    });
  },

  async submitVote() {
    const { mode, likedIndices, vetoedIndices, selectedHardTaboos, selectedTime, timeType, leaveReason, selectedCategoryIds, selectedSubCategories } = this.data;

    // 内容安全检查：请假原因
    if (timeType === 'leave' && leaveReason && leaveReason.trim()) {
      const isContentSafe = await checkContentWithToast(leaveReason.trim());
      if (!isContentSafe) {
        return;
      }
    }

    let voteData;

    if (mode === 'b') {
      if (selectedCategoryIds.length === 0) {
        wx.showToast({ title: '请先选择至少一个分类', icon: 'none' });
        return;
      }
      voteData = {
        cuisinePreferences: selectedCategoryIds.map(cat => ({
          categoryId: cat.id,
          categoryName: cat.name,
          subCategories: selectedSubCategories[cat.id] || []
        })),
        hardTaboos: selectedHardTaboos,
        timeInfo: selectedTime ? {
          type: timeType,
          datetime: selectedTime
        } : null,
        leaveInfo: timeType === 'leave' ? {
          reason: leaveReason
        } : null,
        status: 'voted'
      };
    } else {
      // 模式A：只要浏览过（有喜欢或否决）就可以提交，不需要浏览完所有
      const hasInteracted = likedIndices.length > 0 || vetoedIndices.length > 0;
      // 允许提交，即使没有选择任何选项（相当于弃权）

      voteData = {
        posterIndices: likedIndices,
        vetoIndices: vetoedIndices,
        hardTaboos: selectedHardTaboos,
        timeInfo: selectedTime ? {
          type: timeType,
          datetime: selectedTime
        } : null,
        leaveInfo: timeType === 'leave' ? {
          reason: leaveReason
        } : null,
        status: 'voted'
      };
    }

    this._lockedDoSubmitVote(voteData);
  },

  async doSubmitVote(voteData) {
    try {
      wx.showLoading({ title: '提交中' });

      const { result } = await wx.cloud.callFunction({
        name: 'submitVote',
        data: {
          roomId: this.data.roomId,
          ...voteData
        }
      });

      if (result.success || result.code === 0) {
        wx.hideLoading();
        // 播放成功音效
        audioManager.playSuccess();
        wx.showToast({ title: '投票成功', icon: 'success' });

        // 提交成功后清除本地状态
        this.clearVoteState(this.data.roomId);

        // 检查是否所有成员都已投票，如果是则显示结果通知
        if (result.data && result.data.allVoted) {
          this.setData({
            showVoteResult: true,
            voteResult: result.data.room || {}
          });
        } else {
          // 仅在房间已锁定时才跳转到结果页，否则留在当前页提示用户
          const roomStatus = this.data.room.status || this.data.room.originalStatus;
          if (roomStatus === 'locked') {
            const submitTimer = setTimeout(() => {
              wx.redirectTo({
                url: `/package-vote/pages/result/result?roomId=${this.data.roomId}`
              });
            }, 1500);
            this._timers = this._timers || [];
            this._timers.push(submitTimer);
          } else {
            // 房间未锁定，提示用户可以继续邀请好友或等待他人投票
            setTimeout(() => {
              wx.showModal({
                title: '投票成功',
                content: '您的投票已提交！快去邀请好友一起投票吧~',
                confirmText: '去邀请',
                cancelText: '知道了',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 跳转到控制台页面进行分享邀请
                    wx.redirectTo({
                      url: `/package-vote/pages/control/control?roomId=${this.data.roomId}`
                    });
                  }
                  // 取消则留在当前页面
                }
              });
            }, 500);
          }
        }
      } else {
        throw new Error(result.error || result.msg);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  },

  onTimeChange(e) {
    const { selectedTime } = e.detail;
    this.setData({ selectedTime });
  },

  // 模式B：进入细类选择（合并所有选中大类的细类）
  goToSubCategory() {
    const { selectedCategoryIds, categoryCards, selectedSubCategories } = this.data;
    if (selectedCategoryIds.length === 0) {
      wx.showToast({ title: '请先选择至少一个大类', icon: 'none' });
      return;
    }

    // 合并所有选中大类的细类
    let allSubCategories = [];
    let index = 0;
    
    // 创建分类ID到序号的映射
    const categoryIndexMap = {};
    cuisineCategories.forEach((cat, idx) => {
      categoryIndexMap[cat.id] = idx;
    });
    
    selectedCategoryIds.forEach(categoryId => {
      const category = categoryCards.find(c => c.id === categoryId.id);
      if (category && category.subCategories) {
        const currentSelected = selectedSubCategories[category.id] || [];
        const catIndex = categoryIndexMap[category.id];
        category.subCategories.forEach((sub, subIndex) => {
          // 将 cloud:// 路径转换为 CDN HTTPS URL
          let imagePath = sub.image;
          if (imagePath && imagePath.startsWith('cloud://')) {
            // cloud://cloud1-d4gfy27bn0f3f5346/cuisine-images/xxx.png
            // → https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la/cuisine-images/xxx.png
            imagePath = imagePath.replace(
              'cloud://cloud1-d4gfy27bn0f3f5346',
              'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la'
            );
          }
          // 使用在线图片作为默认图片（确保图片可以正常显示）
          imagePath = imagePath || `https://picsum.photos/400/600?random=${catIndex * 10 + subIndex}`;
          allSubCategories.push({
            ...sub,
            index: index++,
            categoryId: category.id,
            categoryName: category.name,
            status: '',
            image: imagePath,
            isSelected: currentSelected.includes(sub.name)
          });
        });
      }
    });

    // 初始化已选细类名称列表
    const selectedSubCategoryNames = [];
    Object.keys(selectedSubCategories).forEach(catId => {
      const selectedNames = selectedSubCategories[catId];
      if (selectedNames && selectedNames.length > 0) {
        selectedSubCategoryNames.push(...selectedNames);
      }
    });
    // 获取可见的细类列表
    const visibleSubCategoryCards = allSubCategories.filter(s => !s.isHidden);


    this.setData({
      currentStep: 'subcategory',
      subCategoryCards: allSubCategories,
      visibleSubCategoryCards,
      subCategoryCurrentIndex: visibleSubCategoryCards[0]?.index || 0,
      subCategorySwiperCurrent: 0,
      currentSubCategory: visibleSubCategoryCards[0] || {},
      currentCategoryName: '细类选择',
      selectedCategoryIndex: 0,
      selectedSubCategoryNames
    });
  },

  // 模式B：完成细类选择并直接提交
  finishSubCategory() {
    // 检查是否所有大类都已选择细类
    const { selectedCategoryIds, selectedSubCategories } = this.data;
    const unselectedCategories = selectedCategoryIds.filter(cat => {
      const subs = selectedSubCategories[cat.id];
      return !subs || subs.length === 0;
    });

    if (unselectedCategories.length > 0) {
      wx.showModal({
        title: '提示',
        content: `您还有 ${unselectedCategories.length} 个大类未选择细类，是否继续提交？`,
        confirmText: '继续提交',
        cancelText: '去补充',
        success: (res) => {
          if (res.confirm) {
            this.submitVote();
          }
        }
      });
    } else {
      // 所有大类都已选择，直接提交
      this.submitVote();
    }
  },

  // 模式B：返回大类选择
  backToCategory() {
    this.setData({
      currentStep: 'category',
      subCategoryCards: [],
      subCategoryCurrentIndex: 0
    });
  },

  // 模式B：重选当前细类（取消当前细类的选中状态）
  resetCurrentSubCategory() {
    const { subCategorySwiperCurrent, visibleSubCategoryCards, selectedSubCategories, selectedCategoryIds } = this.data;
    
    if (subCategorySwiperCurrent >= visibleSubCategoryCards.length) {
      wx.showToast({ title: '当前无选中项', icon: 'none' });
      return;
    }

    const currentCard = visibleSubCategoryCards[subCategorySwiperCurrent];
    if (!currentCard) return;

    const categoryId = currentCard.categoryId || currentCard.parentId;

    // 从已选细类中移除当前细类
    const newSelectedSub = { ...selectedSubCategories };
    if (newSelectedSub[categoryId]) {
      newSelectedSub[categoryId] = newSelectedSub[categoryId].filter(
        sub => sub.id !== currentCard.id
      );
      // 如果该大类下没有已选细类了，同时取消大类的选中状态
      if (newSelectedSub[categoryId].length === 0) {
        delete newSelectedSub[categoryId];
        const newCategoryIds = selectedCategoryIds.filter(c => c.id !== categoryId);
        // 更新大类卡片的选中状态
        const newCategoryCards = this.data.categoryCards.map(c =>
          c.id === categoryId ? { ...c, isSelected: false } : c
        );
        this.setData({
          selectedSubCategories: newSelectedSub,
          selectedCategoryIds: newCategoryIds,
          categoryCards: newCategoryCards,
          canSubmit: newCategoryIds.length > 0
        });
      } else {
        this.setData({
          selectedSubCategories: newSelectedSub
        });
      }
    }

    // 更新当前卡片为未选中状态
    const newVisibleCards = visibleSubCategoryCards.map((card, idx) =>
      idx === subCategorySwiperCurrent ? { ...card, isSelected: false } : card
    );
    // 同步更新 subCategoryCards 中的对应项
    const newAllCards = this.data.subCategoryCards.map(card =>
      card.id === currentCard.id ? { ...card, isSelected: false } : card
    );

    this.setData({
      visibleSubCategoryCards: newVisibleCards,
      subCategoryCards: newAllCards
    });

    wx.showToast({ title: '已重选', icon: 'success' });
    this.saveVoteState();
  },

  // 模式B：细类选择 - 上一张
  onSubCategoryPrev() {
    const { subCategorySwiperCurrent } = this.data;
    
    if (subCategorySwiperCurrent > 0) {
      this.setData({
        subCategorySwiperCurrent: subCategorySwiperCurrent - 1
      });
    } else {
      wx.showToast({ title: '已经是第一张了', icon: 'none' });
    }
  },

  // 模式B：细类选择 - 下一张
  onSubCategoryNext() {
    const { subCategorySwiperCurrent, visibleSubCategoryCards } = this.data;
    
    if (subCategorySwiperCurrent < visibleSubCategoryCards.length - 1) {
      this.setData({
        subCategorySwiperCurrent: subCategorySwiperCurrent + 1
      });
    } else {
      wx.showToast({ title: '已经是最后一张了', icon: 'none' });
    }
  },

  // 模式B：细类选择 - 双击卡片图片
  onSubCategoryTap(e) {
    const now = Date.now();
    const index = e.currentTarget.dataset.index;
    
    if (this.lastSubCategoryTap && now - this.lastSubCategoryTap < 300) {
      // 双击触发
      this.toggleCurrentSubCategoryLike();
    }
    this.lastSubCategoryTap = now;
  },

  // 模式B：细类选择 - 切换收藏状态
  toggleCurrentSubCategoryFav() {
    const { subCategorySwiperCurrent, visibleSubCategoryCards, subCategoryCards } = this.data;
    const currentCard = visibleSubCategoryCards[subCategorySwiperCurrent];
    if (!currentCard) return;

    const newIsFav = !currentCard.isFav;
    
    // 更新当前卡片的收藏状态
    const newSubCategoryCards = subCategoryCards.map(card => {
      if (card.index === currentCard.index) {
        return { ...card, isFav: newIsFav };
      }
      return card;
    });

    const newVisibleSubCategoryCards = newSubCategoryCards.filter(s => !s.isHidden);

    this.setData({
      subCategoryCards: newSubCategoryCards,
      visibleSubCategoryCards: newVisibleSubCategoryCards,
      currentSubCategory: { ...currentCard, isFav: newIsFav }
    });

    wx.showToast({
      title: newIsFav ? '已收藏' : '取消收藏',
      icon: 'success'
    });
  },

  // ========== 海报分享功能 ==========

  // 显示邀请投票海报
  showSharePoster() {
    const { room } = this.data;
    // 处理 address 可能是对象的情况
    let address = room.address || room.location || '';
    if (address && typeof address === 'object') {
      address = address.name || address.title || address.address || '';
    }

    const posterData = {
      type: 'share',
      roomTitle: room.title || '聚会投票',
      roomCode: room.roomCode || room.code || '',
      roomPassword: room.password || '',
      needPassword: room.needPassword || false,
      roomTime: room.mealTime || room.activityTime || '',
      roomAddress: address,
      qrCodeUrl: ''
    };

    this.setData({
      posterData,
      showPosterModal: true
    });

    // 尝试生成小程序码
    if (this.data.roomId) {
      this.generateVoteQRCode();
    }

  },

  // 生成小程序码（用于海报）
  async generateVoteQRCode() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'generateQRCode',
        data: {
          scene: `roomId=${this.data.roomId}`,
          page: 'package-vote/pages/vote/vote',
          width: 280
        }
      });
      if (result.code === 0 && result.data) {
        // 更新 posterData 中的小程序码
        this.setData({
          'posterData.qrCodeUrl': result.data
        });
      }
    } catch (err) {
    }
  },

  // 海报弹窗关闭
  onPosterClose() {
    this.setData({
      showPosterModal: false,
      posterData: null
    });
  },

  // 海报保存成功
  onPosterSave(e) {
  },

  // 海报分享给好友
  onPosterShareFriend(e) {
  },

  // 分享投票页面 - 通过分享链接进入的用户可绕过好友限制
onShareAppMessage() {
const { room, roomId } = this.data;
return {
title: `「${room?.title || '聚会投票'}」快来一起选餐厅！`,
path: `/package-vote/pages/vote/vote?roomId=${roomId}&shareFrom=1`,
imageUrl: room?.finalPoster?.imageUrl || room?.candidatePosters?.[0]?.imageUrl || ''
};
},

// 举报房间
reportRoom() {
  const { roomId, room } = this.data;
  if (!roomId) return;
  wx.showActionSheet({
    itemList: ['举报该投票'],
    itemColor: '#FF6B6B',
    success: () => {
      wx.navigateTo({
        url: `/package-user/pages/report/report?type=room&targetId=${roomId}`
      });
    }
  });
}
});
