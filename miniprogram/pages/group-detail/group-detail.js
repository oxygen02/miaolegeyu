Page({
  data: {
    roomId: '',
    room: {},
    options: [],
    optionStats: [],
    loading: true,
    hasJoined: false,
    selectedOptionIndex: -1,
    mySelectedOption: -1,
    totalParticipants: 0,
    joining: false
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomData();
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.roomId) {
      this.loadRoomData();
    }
  },

  async loadRoomData() {
    this.setData({ loading: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;
      console.log('拼单房间数据:', room);

      // 计算总参与人数
      const totalParticipants = (room.groupOrderParticipants && room.groupOrderParticipants.length) || 0;

      // 处理选项统计数据，确保每个选项都有count值
      const processedOptionStats = (room.optionStats || []).map(stat => ({
        index: stat.index,
        count: stat.count || 0
      }));

      this.setData({
        room,
        options: room.options || [],
        optionStats: processedOptionStats,
        loading: false,
        hasJoined: room.hasJoinedGroupOrder,
        mySelectedOption: room.mySelectedOption,
        selectedOptionIndex: room.mySelectedOption >= 0 ? room.mySelectedOption : -1,
        totalParticipants
      });
    } catch (err) {
      console.error('加载失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 选择拼单选项
  selectOption(e) {
    const { index } = e.currentTarget.dataset;

    // 如果已经参与过，提示先取消参与
    if (this.data.hasJoined) {
      wx.showModal({
        title: '提示',
        content: '您已经参与过拼单，是否更改选择？',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              selectedOptionIndex: index,
              hasJoined: false // 允许重新选择
            });
          }
        }
      });
      return;
    }

    this.setData({
      selectedOptionIndex: index
    });

    wx.showToast({
      title: `已选择选项${index + 1}，请点击参与拼单`,
      icon: 'none'
    });
  },

  // 参与拼单
  async joinGroupOrder() {
    const { selectedOptionIndex, roomId, hasJoined, mySelectedOption } = this.data;

    // 检查是否选择了选项
    if (selectedOptionIndex < 0) {
      wx.showToast({
        title: '请先选择一个选项',
        icon: 'none'
      });
      return;
    }

    this.setData({ joining: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'joinGroupOrder',
        data: {
          roomId,
          selectedOptionIndex
        }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      wx.showToast({
        title: hasJoined ? '更新成功' : '参与成功',
        icon: 'success'
      });

      // 刷新数据
      this.loadRoomData();

    } catch (err) {
      console.error('参与拼单失败:', err);
      wx.showToast({
        title: err.message || '参与失败',
        icon: 'none'
      });
    } finally {
      this.setData({ joining: false });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRoomData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `【${this.data.room.title || '拼单'}】快来一起拼单！`,
      path: `/pages/group-detail/group-detail?roomId=${this.data.roomId}`
    };
  }
});
