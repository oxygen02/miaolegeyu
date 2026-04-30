const { imagePaths } = require('../../config/imageConfig');
const audioManager = require('../../utils/audioManager');

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
    batchDeleteText: '删除'
  },

  onLoad(options) {
    console.log('喵不喵页面加载', options);
    
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
    this.loadData();
  },

  onShow() {
    // 更新 tabBar 选中状态
    this.updateTabBarSelected();
    // 每次显示时刷新数据
    this.loadData();
  },

  updateTabBarSelected() {
    const tabBar = this.getTabBar();
    if (tabBar) {
      tabBar.setData({ selected: 1 });
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
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载正在进行的活动（所有进行中的）
  async loadOngoingRooms() {
    // 如果是约饭模式，调用不同的云函数
    if (this.data.viewMode === 'meal') {
      await this.loadDiningAppointments();
      return;
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getAllRooms',
        data: { 
          limit: 20,
          mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
        }
      });

      if (result.success && result.rooms) {
        const rooms = result.rooms.map(room => {
          // 根据 mode 确定类型
          let type = 'dining';
          let typeName = '聚餐';
          if (room.mode === 'group') {
            type = 'group';
            typeName = '拼单';
          } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
            type = 'dining';
            typeName = '聚餐';
          }
          const isGroup = room.mode === 'group';
          // 确保 shopName 是字符串
          let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || '地点待定');
          if (typeof shopName === 'object') {
            shopName = shopName.name || shopName.title || JSON.stringify(shopName);
          }
          // 格式化时间
          let timeStr = room.voteDeadline || room.activityTime || room.deadline || '时间待定';
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
              console.error('时间格式化失败:', e);
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
          return {
            id: room.roomId,
            type: type,
            typeName: typeName,
            title: room.title,
            shopName: displayShopName,
            time: timeStr,
            participantCount: room.participantCount || 0,
            image: room.shopImage || (room.candidatePosters && room.candidatePosters[0] && room.candidatePosters[0].imageUrl) || imagePaths.banners.taiyakiIcon,
            status: room.status,
            statusName: room.status === 'voting' ? '进行中' : '已结束',
            roomId: room.roomId,
            platform: room.platform,
            minAmount: room.minAmount,
            currentAmount: room.currentAmount || 0,
            isCreator: false,
            creatorNickName: room.creatorNickName || '未知用户',
            creatorAvatarUrl: room.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon,
            // 拼单参与者头像
            participantAvatars: room.participantAvatars || []
          };
        });

        this.setData({
          ongoingActivities: rooms,
          ongoingCount: rooms.length
        });
      } else {
        this.setData({
          ongoingActivities: [],
          ongoingCount: 0
        });
      }
    } catch (err) {
      console.error('加载进行中的房间失败:', err);
      this.setData({
        ongoingActivities: [],
        ongoingCount: 0
      });
    }
  },

  // 加载约饭活动
  async loadDiningAppointments() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getDiningAppointments',
        data: { limit: 20 }
      });

      if (result.success && result.appointments) {
        const appointments = result.appointments.map(apt => ({
          id: apt.roomId,
          type: 'meal',
          typeName: '约饭',
          title: apt.title,
          shopName: apt.shopName,
          time: apt.activityTime || '时间待定',
          participantCount: apt.participantCount || 0,
          image: imagePaths.banners.taiyakiIcon,
          status: 'voting',
          statusName: '进行中',
          roomId: apt.roomId,
          platform: '',
          minAmount: 0,
          currentAmount: 0,
          isCreator: false,
          creatorNickName: apt.creatorNickName || '神秘喵友',
          creatorAvatarUrl: apt.creatorAvatarUrl || imagePaths.decorations.catAvatarIcon,
          isAppointment: true
        }));

        this.setData({
          ongoingActivities: appointments,
          ongoingCount: appointments.length
        });
      } else {
        this.setData({
          ongoingActivities: [],
          ongoingCount: 0
        });
      }
    } catch (err) {
      console.error('加载约饭活动失败:', err);
      this.setData({
        ongoingActivities: [],
        ongoingCount: 0
      });
    }
  },

  // 加载我发起的活动
  async loadMyRooms() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyRooms',
        data: {
          mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
        }
      });

      if (result.code === 0 && result.data) {
        const rooms = result.data.map(room => {
          // 根据 mode 确定类型
          let type = 'dining';
          let typeName = '聚餐';
          if (room.mode === 'group') {
            type = 'group';
            typeName = '拼单';
          } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
            type = 'dining';
            typeName = '聚餐';
          }
          const isGroup = room.mode === 'group';
          // 确保 shopName 是字符串
          let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || '地点待定');
          if (typeof shopName === 'object') {
            shopName = shopName.name || shopName.title || JSON.stringify(shopName);
          }
          return {
            id: room.roomId,
            type: type,
            typeName: typeName,
            title: room.title,
            shopName: shopName,
            time: room.activityTime || room.deadline || '时间待定',
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

        this.setData({
          myActivities: rooms,
          myCount: rooms.length
        });
      } else {
        this.setData({
          myActivities: [],
          myCount: 0
        });
      }
    } catch (err) {
      console.error('加载我的房间失败:', err);
      this.setData({
        myActivities: [],
        myCount: 0
      });
    }
  },

  // 加载我参与的活动
  async loadParticipatedRooms() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getRecentRooms',
        data: {
          limit: 20,
          mode: this.data.viewMode === 'all' ? '' : this.data.viewMode
        }
      });

      if (result.success && result.rooms) {
        // 根据 viewMode 过滤房间
        let filteredRooms = result.rooms;
        if (this.data.viewMode !== 'all') {
          filteredRooms = result.rooms.filter(room => {
            if (this.data.viewMode === 'group') return room.mode === 'group';
            if (this.data.viewMode === 'dining') return room.mode === 'pick_for_them';
            return true;
          });
        }

        const rooms = filteredRooms.map(room => {
          // 根据 mode 确定类型
          let type = 'dining';
          let typeName = '聚餐';
          if (room.mode === 'group') {
            type = 'group';
            typeName = '拼单';
          } else if (room.mode === 'pick_for_them' || room.mode === 'b') {
            type = 'dining';
            typeName = '聚餐';
          }
          const isGroup = room.mode === 'group';
          // 确保 shopName 是字符串
          let shopName = isGroup ? (room.shopName || '外卖拼单') : (room.location || '地点待定');
          if (typeof shopName === 'object') {
            shopName = shopName.name || shopName.title || JSON.stringify(shopName);
          }
          return {
            id: room.roomId,
            type: type,
            typeName: typeName,
            title: room.title,
            shopName: shopName,
            time: room.activityTime || room.deadline || '时间待定',
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

        this.setData({
          participatedActivities: rooms,
          participatedCount: rooms.length
        });
      } else {
        this.setData({
          participatedActivities: [],
          participatedCount: 0
        });
      }
    } catch (err) {
      console.error('加载参与的房间失败:', err);
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

  // 参与活动（拼单）
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
    } else {
      // 聚餐活动 - 跳转到投票页
      wx.navigateTo({
        url: `/pages/vote/vote?roomId=${roomId}`
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
        throw new Error(result.msg);
      }

      wx.showToast({
        title: '参与成功',
        icon: 'success'
      });

      // 刷新列表
      this.loadData();

    } catch (err) {
      console.error('参与失败:', err);
      wx.showToast({
        title: err.message || '参与失败',
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
      url: `/pages/create-group-order/create-group-order?type=${type}`
    });
  },

  // 创建聚餐
  createDining() {
    this.closeCreateModal();
    wx.navigateTo({
      url: '/pages/create/create'
    });
  },

  // 跳转到活动详情
  goToActivityDetail(e) {
    const roomId = e.currentTarget.dataset.id;
    const activity = this.data.ongoingActivities.find(a => a.id === roomId) || 
                     this.data.myActivities.find(a => a.id === roomId) ||
                     this.data.participatedActivities.find(a => a.id === roomId);
    
    console.log('点击活动，roomId:', roomId, 'type:', activity?.type);
    
    if (!roomId) {
      console.error('roomId 为空');
      wx.showToast({ title: '房间ID无效', icon: 'none' });
      return;
    }

    // 根据活动类型跳转到不同页面
    if (activity?.type === 'group') {
      // 拼单活动 - 跳转到拼单详情页
      wx.navigateTo({
        url: `/pages/group-detail/group-detail?roomId=${roomId}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({ title: '页面跳转失败', icon: 'none' });
        }
      });
    } else {
      // 聚餐投票活动
      wx.navigateTo({
        url: `/pages/vote/vote?roomId=${roomId}`,
        fail: (err) => {
          console.error('跳转失败:', err);
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
        url: `/pages/group-order-control/group-order-control?roomId=${roomId}`
      });
    } else {
      // 聚餐活动跳转到control页面
      wx.navigateTo({
        url: `/pages/control/control?roomId=${roomId}`
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

  // 跳转到发现美食
  goToFoodDiscovery() {
    wx.navigateTo({
      url: '/pages/food-discovery/food-discovery'
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
      for (const item of selectedItems) {
        if (item.isCreator) {
          // 删除自己创建的活动
          await wx.cloud.callFunction({
            name: 'deleteRoom',
            data: { roomId: item.id }
          });
        } else {
          // 退出参与的活动
          await wx.cloud.callFunction({
            name: 'quitRoom',
            data: { roomId: item.id }
          });
        }
      }
      
      wx.hideLoading();
      wx.showToast({ title: '操作成功', icon: 'success' });
      
      // 退出编辑模式并刷新数据
      this.setData({ isEditMode: false });
      this.loadData();
    } catch (err) {
      wx.hideLoading();
      console.error('批量操作失败:', err);
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
  }
});
