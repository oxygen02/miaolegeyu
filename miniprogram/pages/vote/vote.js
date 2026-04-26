const app = getApp();
const { cuisineCategories } = require('../../data/cuisineCategories.js');

Page({
  data: {
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
      { name: 'celery', label: '芹菜', selected: false }
    ],
    categoryCards: [],
    categoryCurrentIndex: 0,
    selectedCategoryIds: [],
    subCategoryCards: [],
    subCategoryCurrentIndex: 0,
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
    swipeHistory: []
  },

  onLoad(options) {
    const { roomId, mock, mode: mockMode } = options;
    this.setData({ roomId });

    // 获取屏幕宽度
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      screenWidth: sysInfo.windowWidth
    });

    // 双击检测
    this.lastTap = 0;

    if (mock === 'true' || mock === true || mock === '1') {
      const mode = mockMode || 'a';
      console.log('进入模拟模式，mode:', mode);
      this.loadMockData(mode);
    } else {
      console.log('正常加载房间数据，mock:', mock);
      // 先尝试恢复本地状态
      const hasRestored = this.restoreVoteState(roomId);
      if (!hasRestored) {
        this.loadRoomData(roomId);
      }
    }
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
    console.log('投票状态已保存');
  },

  // 恢复投票状态
  restoreVoteState(roomId) {
    if (!roomId) return false;

    const savedState = wx.getStorageSync(`vote_state_${roomId}`);
    if (!savedState) {
      console.log('没有找到保存的投票状态');
      return false;
    }

    // 检查状态是否过期（24小时）
    const now = Date.now();
    const saveTime = savedState.saveTime || 0;
    if (now - saveTime > 24 * 60 * 60 * 1000) {
      console.log('投票状态已过期');
      wx.removeStorageSync(`vote_state_${roomId}`);
      return false;
    }

    console.log('恢复投票状态:', savedState.mode, savedState.currentStep);

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
  },

  // 清除投票状态
  clearVoteState(roomId) {
    if (!roomId) return;
    wx.removeStorageSync(`vote_state_${roomId}`);
    console.log('投票状态已清除');
  },

  loadMockData(mode = 'a') {
    console.log('loadMockData 被调用，mode:', mode);

    // 模拟房间ID
    const mockRoomId = 'mock-room-' + Date.now();
    this.setData({ roomId: mockRoomId });

    if (mode === 'b') {
      const categoryCards = cuisineCategories.map((cat, index) => ({
        ...cat,
        index,
        status: '',
        isVetoed: false,
        isSelected: false,
        darkColor: cat.darkColor || cat.color
      }));

      const mockRoom = {
        _id: mockRoomId,
        title: '模拟聚餐投票 - 选偏好',
        mode: 'b',
        status: 'voting'
      };

      console.log('设置模式B数据，categoryCards数量:', categoryCards.length);
      this.setData({
        room: mockRoom,
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
      const mockPosters = [
        {
          index: 0,
          imageUrl: '/assets/images/wotiaohaole1.png',
          platformSource: 'meituan',
          shopName: '海底捞火锅',
          status: '',
          isVetoed: false,
          isLiked: false,
          isFav: false
        },
        {
          index: 1,
          imageUrl: '/assets/images/nimenlaiding2.png',
          platformSource: 'dianping',
          shopName: '西贝莜面村',
          status: '',
          isVetoed: false,
          isLiked: false,
          isFav: false
        },
        {
          index: 2,
          imageUrl: '/assets/images/wotiaohaole1.png',
          platformSource: 'meituan',
          shopName: '太二酸菜鱼',
          status: '',
          isVetoed: false,
          isLiked: false,
          isFav: false
        },
        {
          index: 3,
          imageUrl: '/assets/images/nimenlaiding2.png',
          platformSource: 'dianping',
          shopName: '点都德',
          status: '',
          isVetoed: false,
          isLiked: false,
          isFav: false
        }
      ];

      const mockRoom = {
        _id: mockRoomId,
        title: '模拟聚餐投票 - 选饭店',
        mode: 'a',
        status: 'voting'
      };

      console.log('设置模式A数据，posters数量:', mockPosters.length);
      this.setData({
        room: mockRoom,
        posters: mockPosters,
        mode: 'a',
        currentIndex: 0,
        categoryCurrentIndex: 0,
        subCategoryCurrentIndex: 0
      });
    }
  },

  onUnload() {
  },

  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });
      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;
      console.log('房间数据:', room);

      const mode = room.mode || 'a';

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

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
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
      const oldPoster = posters[oldIndex];

      // 如果之前没有选择过（既不喜欢也不否决），才标记为否决
      if (!oldPoster.isLiked && !oldPoster.isVetoed) {
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

    wx.showToast({
      title: isLiked ? '取消选择' : '想要喵',
      icon: 'success'
    });

    // 3秒后隐藏爱心猫咪
    if (!isLiked) {
      setTimeout(() => {
        this.setData({
          showLoveCat: false,
          loveCatIndex: -1
        });
      }, 3000);
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

      wx.showToast({
        title: '取消选择',
        icon: 'success'
      });
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

      wx.showToast({
        title: '已选择',
        icon: 'success'
      });
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
    const newIndex = e.detail.current;
    const oldIndex = this.data.subCategoryCurrentIndex;
    const { subCategoryCards } = this.data;
    const currentSubCategory = subCategoryCards[newIndex] || {};

    if (newIndex > oldIndex) {
      // 上滑 - 跳过（只在未选择状态下）
      const oldSub = subCategoryCards[oldIndex];

      if (!oldSub.isSelected) {
        this.recordSwipeHistory(-1, oldIndex, 'subcategory');
        this.setData({
          subCategoryCurrentIndex: newIndex,
          currentSubCategory,
          canUndo: true
        });
      } else {
        this.setData({
          subCategoryCurrentIndex: newIndex,
          currentSubCategory
        });
      }
    } else {
      this.setData({
        subCategoryCurrentIndex: newIndex,
        currentSubCategory
      });
    }
  },

  // 切换当前细类的喜欢状态
  toggleCurrentSubCategoryLike() {
    const { subCategoryCurrentIndex } = this.data;
    this.toggleSubCategoryLikeByIndex(subCategoryCurrentIndex);
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

  toggleSubCategoryLikeByIndex(index) {
    const { subCategoryCards, selectedSubCategories } = this.data;
    const sub = subCategoryCards[index];

    const categoryId = sub.categoryId;
    const currentSelected = selectedSubCategories[categoryId] || [];
    const isSelected = sub.isSelected;

    let newSelectedForCategory;
    let newSubCategoryCards;

    if (isSelected) {
      // 取消选择：恢复显示该大类下的所有细类
      newSelectedForCategory = [];
      newSubCategoryCards = subCategoryCards.map(s =>
        s.categoryId === categoryId ? { ...s, isSelected: false, isHidden: false } : s
      );
    } else {
      // 选择：只保留当前选中的，隐藏同大类的其他细类
      newSelectedForCategory = [sub.name];
      newSubCategoryCards = subCategoryCards.map(s => {
        if (s.categoryId === categoryId) {
          // 同大类：当前选中项显示，其他隐藏
          return { ...s, isSelected: s.index === sub.index, isHidden: s.index !== sub.index };
        }
        return s;
      });
    }

    selectedSubCategories[categoryId] = newSelectedForCategory;

    // 更新已选细类名称列表
    const selectedSubCategoryNames = newSubCategoryCards
      .filter(s => s.isSelected)
      .map(s => s.name);

    this.setData({
      selectedSubCategories: { ...selectedSubCategories },
      subCategoryCards: newSubCategoryCards,
      selectedSubCategoryNames
    });

    // 保存状态
    this.saveVoteState();

    wx.showToast({
      title: isSelected ? '取消想吃' : '已标记想吃',
      icon: 'success'
    });
  },

  // 细类收藏
  toggleSubCategoryFav(e) {
    const index = e.currentTarget.dataset.index;
    const { subCategoryCards } = this.data;
    const sub = subCategoryCards[index];
    const isFav = sub.isFav;

    const newSubCategoryCards = subCategoryCards.map((s, i) =>
      i === index ? { ...s, isFav: !isFav } : s
    );

    this.setData({
      subCategoryCards: newSubCategoryCards
    });

    wx.showToast({
      title: isFav ? '已取消收藏' : '已收藏',
      icon: 'success'
    });
  },

  // 重置细类选择
  resetSubCategoryChoice(e) {
    const index = e.currentTarget.dataset.index;
    const { subCategoryCards, selectedSubCategories } = this.data;
    const sub = subCategoryCards[index];

    const categoryId = sub.categoryId;
    const currentSelected = selectedSubCategories[categoryId] || [];
    const newSelectedForCategory = currentSelected.filter(id => id !== sub.id);

    selectedSubCategories[categoryId] = newSelectedForCategory;

    const newSubCategoryCards = subCategoryCards.map((s, i) =>
      i === index ? { ...s, isSelected: false } : s
    );

    this.setData({
      selectedSubCategories: { ...selectedSubCategories },
      subCategoryCards: newSubCategoryCards
    });

    wx.showToast({
      title: '已重置',
      icon: 'success'
    });
  },

  onSubCategorySkip(e) {
    const index = e.currentTarget.dataset.index;
    const { subCategoryCards } = this.data;

    if (index >= subCategoryCards.length - 1) {
      wx.showToast({ title: '已经是最后一个了', icon: 'none' });
      return;
    }

    this.setData({
      subCategoryCurrentIndex: index + 1
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
      success: (res) => {
        if (res.confirm) {
          this.submitVote({
            posterIndices: [],
            vetoIndices: [],
            cuisinePreferences: [],
            status: 'waived'
          });
        }
      }
    });
  },

  submitVote() {
    const { mode, likedIndices, vetoedIndices, selectedHardTaboos, selectedTime, timeType, leaveReason, selectedCategoryIds, selectedSubCategories } = this.data;

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
      if (likedIndices.length === 0 && vetoedIndices.length === 0) {
        wx.showToast({ title: '请先浏览并选择海报', icon: 'none' });
        return;
      }

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

    this.doSubmitVote(voteData);
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
        wx.showToast({ title: '投票成功', icon: 'success' });

        // 提交成功后清除本地状态
        this.clearVoteState(this.data.roomId);

        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/result/result?roomId=${this.data.roomId}`
          });
        }, 1500);
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
          // 使用数据文件中定义的图片路径，如果不存在则按规则生成
          const imagePath = sub.image || `/assets/images/cuisine_all/category_${String(catIndex + 1).padStart(2, '0')}_${String(subIndex + 1).padStart(2, '0')}.png`;
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

    this.setData({
      currentStep: 'subcategory',
      subCategoryCards: allSubCategories,
      subCategoryCurrentIndex: 0,
      currentSubCategory: allSubCategories[0] || {},
      currentCategoryName: '细类选择',
      selectedCategoryIndex: 0
    });
  },

  // 模式B：完成细类选择
  finishSubCategory() {
    this.setData({
      canSubmit: true
    });
    wx.showToast({ title: '选择完成，可以提交了', icon: 'success' });
  },

  // 模式B：返回大类选择
  backToCategory() {
    this.setData({
      currentStep: 'category',
      subCategoryCards: [],
      subCategoryCurrentIndex: 0
    });
  },

  // 模式B：细类选择 - 上一张
  onSubCategoryPrev() {
    const { subCategoryCurrentIndex } = this.data;
    if (subCategoryCurrentIndex > 0) {
      this.setData({
        subCategoryCurrentIndex: subCategoryCurrentIndex - 1
      });
    } else {
      wx.showToast({ title: '已经是第一张了', icon: 'none' });
    }
  },

  // 模式B：细类选择 - 下一张
  onSubCategoryNext() {
    const { subCategoryCurrentIndex, subCategoryCards } = this.data;
    const visibleCards = subCategoryCards.filter(c => !c.isHidden);
    if (subCategoryCurrentIndex < visibleCards.length - 1) {
      this.setData({
        subCategoryCurrentIndex: subCategoryCurrentIndex + 1
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
    const { subCategoryCurrentIndex, subCategoryCards } = this.data;
    const currentCard = subCategoryCards[subCategoryCurrentIndex];
    if (!currentCard) return;

    const newIsFav = !currentCard.isFav;
    
    // 更新当前卡片的收藏状态
    const newSubCategoryCards = subCategoryCards.map((card, index) => {
      if (index === subCategoryCurrentIndex) {
        return { ...card, isFav: newIsFav };
      }
      return card;
    });

    this.setData({
      subCategoryCards: newSubCategoryCards,
      currentSubCategory: { ...currentCard, isFav: newIsFav }
    });

    wx.showToast({
      title: newIsFav ? '已收藏' : '取消收藏',
      icon: 'success'
    });
  }
});
