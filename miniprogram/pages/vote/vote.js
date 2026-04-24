const app = getApp();
const { cuisineCategories } = require('../../data/cuisineCategories.js');

Page({
  data: {
    room: {},
    posters: [],
    currentIndex: 0,
    cardAreaHeight: 500,
    mode: 'a',
    showUndo: false,
    lastAction: '',
    lastPosterName: '',
    tabooExpanded: false,
    selectedHardTaboos: [],
    selectedSoftTaboos: [],
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
    currentStep: 'category',
    timeType: 'departure',
    selectedTime: '',
    leaveReason: '',
    timeRange: [
      ['今天', '明天', '后天'],
      ['11:00', '12:00', '13:00', '14:00', '17:00', '18:00', '19:00', '20:00', '21:00']
    ],
    likedIndices: [],
    vetoedIndices: [],
    canSubmit: false,
    showGuide: false
  },

  onLoad(options) {
    const { roomId, mock, mode: mockMode } = options;
    this.setData({ roomId });
    this.initCardArea();

    if (mock === 'true' || mock === true || mock === '1') {
      const mode = mockMode || 'a';
      console.log('进入模拟模式，mode:', mode);
      this.loadMockData(mode);
    } else {
      console.log('正常加载房间数据，mock:', mock);
      this.loadRoomData(roomId);
    }
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
        isVetoed: false
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
        currentIndex: 0
      });
    } else {
      const mockPosters = [
        {
          index: 0,
          imageUrl: '/assets/images/wotiaohaole1.png',
          platformSource: 'meituan',
          shopName: '海底捞火锅',
          status: '',
          isVetoed: false
        },
        {
          index: 1,
          imageUrl: '/assets/images/nimenlaiding2.png',
          platformSource: 'dianping',
          shopName: '西贝莜面村',
          status: '',
          isVetoed: false
        },
        {
          index: 2,
          imageUrl: '/assets/images/wotiaohaole1.png',
          platformSource: 'meituan',
          shopName: '太二酸菜鱼',
          status: '',
          isVetoed: false
        },
        {
          index: 3,
          imageUrl: '/assets/images/nimenlaiding2.png',
          platformSource: 'dianping',
          shopName: '点都德',
          status: '',
          isVetoed: false
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
        currentIndex: 0
      });
    }
  },

  onUnload() {
  },

  initCardArea() {
    const sysInfo = wx.getSystemInfoSync();
    const cardAreaHeight = sysInfo.windowHeight - 300;
    this.setData({ cardAreaHeight });
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
      console.log('海报数据:', room.candidatePosters);

      const mode = room.mode || 'a';

      if (mode === 'b') {
        const categoryCards = cuisineCategories.map((cat, index) => ({
          ...cat,
          index,
          status: '',
          isVetoed: false
        }));

        this.setData({
          room,
          mode: 'b',
          categoryCards,
          currentStep: 'category',
          selectedCategoryIds: [],
          selectedSubCategories: {},
          posters: []
        });
      } else {
        const candidatePosters = room.candidatePosters || [];

        const posters = candidatePosters.map((p, index) => ({
          ...p,
          index,
          status: '',
          isVetoed: false
        }));

        this.setData({
          room,
          mode: 'a',
          posters
        });
      }

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },



  showUndoBar(action, posterName) {
    this.setData({
      showUndo: true,
      lastAction: action,
      lastPosterName: posterName
    });
  },

  undoLast() {
    const { currentIndex, likedIndices, vetoedIndices } = this.data;
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return;

    // 判断上一个卡片是喜欢还是不喜欢
    const wasLiked = likedIndices.includes(prevIndex);
    const wasVetoed = vetoedIndices.includes(prevIndex);

    const updateData = {
      [`posters[${prevIndex}].isVetoed`]: false,
      currentIndex: prevIndex
    };

    if (wasLiked) {
      updateData.likedIndices = likedIndices.filter(i => i !== prevIndex);
    }
    if (wasVetoed) {
      updateData.vetoedIndices = vetoedIndices.filter(i => i !== prevIndex);
    }

    this.setData(updateData);
    this.updateCanSubmit();
  },

  updateCanSubmit() {
    const canSubmit = this.data.likedIndices.length > 0 || this.data.vetoedIndices.length > 0;
    this.setData({ canSubmit });
  },

  // WXS 回调：卡片滑动完成
  onCardSwiped(event) {
    const { index, direction } = event;
    const currentIndex = parseInt(index);
    
    if (direction === 'left') {
      // 左滑 - 不喜欢
      const { selectedHardTaboos } = this.data;
      const updateData = {
        currentIndex: currentIndex + 1
      };
      if (selectedHardTaboos.length > 0) {
        updateData.vetoedIndices = [...this.data.vetoedIndices, currentIndex];
        updateData[`posters[${currentIndex}].isVetoed`] = true;
      }
      this.setData(updateData);
      this.showUndoBar('left', `海报${currentIndex + 1}`);
    } else {
      // 右滑 - 喜欢
      const likedIndices = [...this.data.likedIndices, currentIndex];
      this.setData({
        likedIndices,
        canSubmit: likedIndices.length > 0 || this.data.vetoedIndices.length > 0,
        currentIndex: currentIndex + 1
      });
      this.showUndoBar('right', `海报${currentIndex + 1}`);
    }
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
  },

  toggleSoftTaboo(e) {
    const { name } = e.currentTarget.dataset;
    const softTaboos = this.data.softTaboos.map(item => {
      if (item.name === name) {
        return { ...item, selected: !item.selected };
      }
      return item;
    });

    const selectedSoftTaboos = softTaboos.filter(i => i.selected).map(i => i.name);
    this.setData({ softTaboos, selectedSoftTaboos });
  },

  switchTimeType(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ timeType: type });
  },

  onLeaveReasonInput(e) {
    this.setData({ leaveReason: e.detail.value });
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
    const { mode, likedIndices, vetoedIndices, selectedHardTaboos, selectedSoftTaboos, selectedTime, timeType, leaveReason } = this.data;

    let voteData;

    if (mode === 'b') {
      wx.showToast({ title: '模式B投票开发中', icon: 'none' });
      return;
    } else {
      if (likedIndices.length === 0 && vetoedIndices.length === 0) {
        wx.showToast({ title: '请先滑动选择海报', icon: 'none' });
        return;
      }

      voteData = {
        posterIndices: likedIndices,
        vetoIndices: vetoedIndices,
        hardTaboos: selectedHardTaboos,
        softTaboos: selectedSoftTaboos,
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

  checkFirstTimeUser() {
  },

  showGuide() {
    this.setData({ showGuide: true });
  },

  closeGuide() {
    this.setData({ showGuide: false });
  },

  preventBubble() {
  },

  // WXS 回调：卡片滑动完成
  onCardSwiped(event) {
    const { index, direction } = event;
    const currentIndex = parseInt(index);
    
    if (direction === 'left') {
      // 左滑 - 不喜欢
      const { selectedHardTaboos } = this.data;
      if (selectedHardTaboos.length > 0) {
        const vetoedIndices = [...this.data.vetoedIndices, currentIndex];
        this.setData({
          [`posters[${currentIndex}].isVetoed`]: true,
          vetoedIndices,
          currentIndex: currentIndex + 1
        });
      } else {
        this.setData({
          currentIndex: currentIndex + 1
        });
      }
      this.showUndoBar('left', `海报${currentIndex + 1}`);
    } else {
      // 右滑 - 喜欢
      const likedIndices = [...this.data.likedIndices, currentIndex];
      this.setData({
        likedIndices,
        canSubmit: likedIndices.length > 0 || this.data.vetoedIndices.length > 0,
        currentIndex: currentIndex + 1
      });
      this.showUndoBar('right', `海报${currentIndex + 1}`);
    }
  }
});
