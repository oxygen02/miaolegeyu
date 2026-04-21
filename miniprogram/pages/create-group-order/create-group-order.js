const { generateRoomId } = require('../../utils/uuid.js');
Page({
  data: {
    title: '',
    shopName: '',
    minAmount: '',
    selectedPlatform: 'meituan',
    deadlineText: '',
    timeRange: [['今天','明天','后天'], ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']],
    timeIndex: [0, 2]
  },
  onLoad() { this.updateDeadlineText(); },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onShopInput(e) { this.setData({ shopName: e.detail.value }); },
  onAmountInput(e) { this.setData({ minAmount: e.detail.value }); },
  onTimeChange(e) { this.setData({ timeIndex: e.detail.value }, () => this.updateDeadlineText()); },
  selectPlatform(e) { this.setData({ selectedPlatform: e.currentTarget.dataset.platform }); },
  updateDeadlineText() {
    const [d, t] = this.data.timeIndex;
    const day = this.data.timeRange[0][d];
    const time = this.data.timeRange[1][t];
    this.setData({ deadlineText: `${day} ${time}` });
  },
  canSubmit() { return this.data.title && this.data.shopName && this.data.minAmount; },
  async createGroupOrder() {
    if (!this.canSubmit()) { wx.showToast({ title: '请填写完整信息', icon: 'none' }); return; }
    wx.showLoading({ title: '创建中...' });
    try {
      const roomId = generateRoomId();
      await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          roomId,
          mode: 'group',
          title: this.data.title,
          shopName: this.data.shopName,
          minAmount: this.data.minAmount,
          platform: this.data.selectedPlatform
        }
      });
      wx.hideLoading();
      wx.redirectTo({ url: `/pages/fish-tank/fish-tank?roomId=${roomId}` });
    } catch (err) { wx.hideLoading(); wx.showToast({ title: '创建失败', icon: 'none' }); }
  }
});
