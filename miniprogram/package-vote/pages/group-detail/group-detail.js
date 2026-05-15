// 平台名称映射（英文标识 -> 中文显示）
const PLATFORM_NAMES = {
  meituan: '美团',
  taobao: '淘宝闪送',
  jd: '京东'
};

// 获取平台中文名称
function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform || '';
}

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
    joining: false,
    // 平台名称映射
    PLATFORM_NAMES: PLATFORM_NAMES,
    // 详情弹窗
    showDetailModal: false,
    currentOption: null,
    currentOptionIndex: -1
  },

  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    if (!src) return;

    wx.previewImage({
      current: src,
      urls: [src]
    });
  },

  // 显示选项详情弹窗
  showOptionDetail(e) {
    const { index } = e.currentTarget.dataset;
    const option = this.data.options[index];
    if (!option) return;

    this.setData({
      showDetailModal: true,
      currentOption: option,
      currentOptionIndex: index
    });
  },

  // 关闭选项详情弹窗
  closeOptionDetail() {
    this.setData({
      showDetailModal: false,
      currentOption: null,
      currentOptionIndex: -1
    });
  },

  // 阻止事件冒泡
  preventBubble() {
    // 什么都不做，只是阻止冒泡
  },

  // 复制链接
  copyLink(e) {
    const { link } = e.currentTarget.dataset;
    if (!link) return;

    wx.setClipboardData({
      data: link,
      success: () => {
        wx.showToast({ title: '链接已复制', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '复制失败', icon: 'none' });
      }
    });
  },

  // 选择当前选项并关闭弹窗
  selectAndClose() {
    const { currentOptionIndex } = this.data;
    if (currentOptionIndex < 0) return;

    this.setData({
      selectedOptionIndex: currentOptionIndex,
      showDetailModal: false
    });

    wx.showToast({
      title: `已选择选项${currentOptionIndex + 1}`,
      icon: 'none'
    });
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

      // 计算总参与人数
      const totalParticipants = (room.groupOrderParticipants && room.groupOrderParticipants.length) || 0;

      // 处理选项数据，为每个选项添加平台中文名称
      const processedOptions = (room.options || []).map(opt => ({
        ...opt,
        platformName: getPlatformName(opt.platform)
      }));

      // 处理选项统计数据，确保每个选项都有count值（即使为0也要显示）
      // 先用返回的optionStats构建map，再为每个option补全
      const statsMap = {};
      (room.optionStats || []).forEach(stat => {
        statsMap[stat.index] = stat.count || 0;
      });
      const processedOptionStats = processedOptions.map((opt, idx) => ({
        index: idx,
        count: statsMap[idx] !== undefined ? statsMap[idx] : 0
      }));

      this.setData({
        room,
        options: processedOptions,
        optionStats: processedOptionStats,
        loading: false,
        hasJoined: room.hasJoinedGroupOrder,
        mySelectedOption: room.mySelectedOption,
        selectedOptionIndex: room.mySelectedOption >= 0 ? room.mySelectedOption : -1,
        totalParticipants
      });
    } catch (err) {
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
      path: `/package-vote/pages/group-detail/group-detail?roomId=${this.data.roomId}`
    };
  }
});
