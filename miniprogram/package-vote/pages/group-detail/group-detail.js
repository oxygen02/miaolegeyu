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
    selectedOptionIndices: [], // 多选：已选择的选项索引数组
    selectedOptionIndex: -1, // 兼容旧逻辑
    mySelectedOption: -1,
    mySelectedOptions: [], // 多选：服务端返回的我已选的选项
    isSelectionChanged: false, // 选择是否已更改（用于控制更新按钮）
    optionSelections: [], // 每个选项的选中状态 [{selected: bool, joined: bool}, ...]
    totalParticipants: 0,
    joining: false,
    quitting: false,
    deleting: false,
    isCreator: false,
    // 平台名称映射
    PLATFORM_NAMES: PLATFORM_NAMES,
    // 详情弹窗
    showDetailModal: false,
    currentOption: null,
    currentOptionIndex: -1
  },

  // 比较两个数组是否相同
  _arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((val, i) => val === b[i]);
  },

  // 更新选择是否变更的状态
  _updateSelectionChanged(selectedOptionIndices) {
    const { mySelectedOptions } = this.data;
    const changed = !this._arraysEqual(selectedOptionIndices, mySelectedOptions);
    this.setData({ isSelectionChanged: changed });
  },

  // 计算每个选项的选中状态（供 WXML 使用）
  // status: 'joined'（已确认）| 'pending'（待提交更改）| 'cancelled'（已取消待提交）| 'normal'（未选中）
  _updateOptionSelections(selectedOptionIndices) {
    const { options, mySelectedOptions, isSelectionChanged, hasJoined } = this.data;
    const optionSelections = options.map((_, idx) => {
      const currentlySelected = selectedOptionIndices.indexOf(idx) >= 0;
      const wasJoined = mySelectedOptions.indexOf(idx) >= 0;
      
      let status = 'normal';
      if (hasJoined) {
        if (currentlySelected && wasJoined) {
          status = 'joined'; // 已确认（没改过）
        } else if (currentlySelected && !wasJoined) {
          status = 'pending'; // 新选中（待提交）
        } else if (!currentlySelected && wasJoined) {
          status = 'cancelled'; // 取消了已选（待提交）
        }
      } else if (currentlySelected) {
        status = 'pending'; // 新选中（未参与过）
      }
      
      return {
        selected: currentlySelected,
        joined: wasJoined,
        status // 新增：精确状态
      };
    });
    this.setData({ optionSelections });
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

  // 选择当前选项并关闭弹窗（多选 toggle）
  selectAndClose() {
    const { currentOptionIndex, selectedOptionIndices, hasJoined } = this.data;
    if (currentOptionIndex < 0) return;

    let newSelections;
    if (hasJoined) {
      // 已参与时，弹窗底部显示"切换到此选项"
      newSelections = [currentOptionIndex];
    } else {
      // 未参与时，toggle 选择
      newSelections = [...selectedOptionIndices];
      const pos = newSelections.indexOf(currentOptionIndex);
      if (pos >= 0) {
        newSelections.splice(pos, 1);
      } else {
        newSelections.push(currentOptionIndex);
      }
      newSelections.sort((a, b) => a - b);
    }

    this.setData({
      selectedOptionIndices: newSelections,
      selectedOptionIndex: newSelections.length > 0 ? newSelections[0] : -1,
      showDetailModal: false
    });
    this._updateSelectionChanged(newSelections);
    this._updateOptionSelections(newSelections);

    wx.showToast({
      title: `已选${newSelections.length}个选项`,
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

      // 多选支持：从服务端获取已选选项列表
      const serverSelectedOptions = (room.mySelectedOptions && room.mySelectedOptions.length > 0)
        ? room.mySelectedOptions
        : (room.mySelectedOption >= 0 ? [room.mySelectedOption] : []);

      this.setData({
        room,
        options: processedOptions,
        optionStats: processedOptionStats,
        loading: false,
        hasJoined: room.hasJoinedGroupOrder,
        mySelectedOption: room.mySelectedOption,
        mySelectedOptions: serverSelectedOptions,
        selectedOptionIndex: serverSelectedOptions.length > 0 ? serverSelectedOptions[0] : -1,
        selectedOptionIndices: serverSelectedOptions, // 多选：初始化为已选的选项
        totalParticipants,
        isCreator: room.isCreator || false
      });
      this._updateSelectionChanged(serverSelectedOptions);
      this._updateOptionSelections(serverSelectedOptions);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 选择拼单选项（多选 toggle 模式）
  selectOption(e) {
    const { index } = e.currentTarget.dataset;
    const idx = Number(index);
    let { selectedOptionIndices } = this.data;

    // 直接 toggle 选择状态（已参与或未参与统一处理）
    const newSelections = [...selectedOptionIndices];
    const pos = newSelections.indexOf(idx);
    if (pos >= 0) {
      newSelections.splice(pos, 1); // 取消选择
    } else {
      newSelections.push(idx); // 新增选择
    }
    newSelections.sort((a, b) => a - b);

    this.setData({
      selectedOptionIndices: newSelections,
      selectedOptionIndex: newSelections.length > 0 ? newSelections[0] : -1
    });
    this._updateSelectionChanged(newSelections);
    this._updateOptionSelections(newSelections);

    wx.showToast({
      title: newSelections.length > 0
        ? `已选${newSelections.length}个选项`
        : '已取消所有选择',
      icon: 'none',
      duration: 1200
    });
  },

  // 参与拼单（支持多选提交）
  async joinGroupOrder() {
    const { selectedOptionIndices, roomId, hasJoined } = this.data;

    // 检查是否选择了选项
    if (!selectedOptionIndices || selectedOptionIndices.length === 0) {
      wx.showToast({
        title: '请至少选择一个选项',
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
          selectedOptionIndices // 传多选数组
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

  // 退出拼单活动
  async quitGroupOrder() {
    const { roomId, hasJoined } = this.data;

    if (!hasJoined) {
      wx.showToast({ title: '您还未参与拼单', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认退出',
      content: '确定要退出这个拼单活动吗？',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (res.confirm) {
          await this.doQuitGroupOrder();
        }
      }
    });
  },

  // 执行退出拼单
  async doQuitGroupOrder() {
    const { roomId } = this.data;

    this.setData({ quitting: true });

    try {
      wx.showLoading({ title: '退出中...' });

      const { result } = await wx.cloud.callFunction({
        name: 'quitGroupOrder',
        data: { roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg || '退出失败');
      }

      wx.showToast({ title: '已退出拼单', icon: 'success' });

      // 重置状态并刷新数据
      this.setData({
        hasJoined: false,
        mySelectedOption: -1,
        mySelectedOptions: [],
        selectedOptionIndex: -1,
        selectedOptionIndices: []
      });
      this.loadRoomData();

    } catch (err) {
      wx.showToast({ title: err.message || '退出失败', icon: 'none' });
    } finally {
      this.setData({ quitting: false });
      wx.hideLoading();
    }
  },

  // 删除拼单活动（仅发起人）
  deleteActivity() {
    const { roomId, isCreator } = this.data;

    if (!isCreator) {
      wx.showToast({ title: '只有发起人可以删除活动', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个拼单活动吗？此操作不可恢复！',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (res.confirm) {
          await this.doDeleteActivity();
        }
      }
    });
  },

  // 执行删除活动
  async doDeleteActivity() {
    const { roomId } = this.data;

    this.setData({ deleting: true });

    try {
      wx.showLoading({ title: '删除中...' });

      const { result } = await wx.cloud.callFunction({
        name: 'deleteRoom',
        data: { roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg || '删除失败');
      }

      wx.showToast({ title: '删除成功', icon: 'success' });

      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.showToast({ title: err.message || '删除失败', icon: 'none' });
    } finally {
      this.setData({ deleting: false });
      wx.hideLoading();
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
