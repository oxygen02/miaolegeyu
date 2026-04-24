const { generateRoomId } = require('../../utils/uuid.js');
Page({
  data: {
    title: '',
    minAmount: '',
    selectedPlatform: 'meituan',
    deadlineText: '',
    timeRange: [['今天','明天','后天'], ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']],
    timeIndex: [0, 2],
    tempTimeIndex: [0, 2],
    showTimePickerPopup: false,
    shopImage: '',
    shopLink: ''
  },
  onLoad() { this.updateDeadlineText(); },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onAmountInput(e) { this.setData({ minAmount: e.detail.value }); },
  onShopLinkInput(e) { this.setData({ shopLink: e.detail.value }); },
  showTimePicker() {
    this.setData({
      showTimePickerPopup: true,
      tempTimeIndex: this.data.timeIndex
    });
  },
  closeTimePicker() {
    this.setData({ showTimePickerPopup: false });
  },
  confirmTimePicker() {
    this.setData({
      timeIndex: this.data.tempTimeIndex,
      showTimePickerPopup: false
    }, () => this.updateDeadlineText());
  },
  onPickerViewChange(e) {
    this.setData({ tempTimeIndex: e.detail.value });
  },
  selectPlatform(e) { this.setData({ selectedPlatform: e.currentTarget.dataset.platform }); },
  updateDeadlineText() {
    const [d, t] = this.data.timeIndex;
    const day = this.data.timeRange[0][d];
    const time = this.data.timeRange[1][t];
    this.setData({ deadlineText: `${day} ${time}` });
  },
  // 选择店铺图片
  chooseShopImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ shopImage: tempFilePath });
      }
    });
  },
  // 预览店铺图片
  previewShopImage() {
    wx.previewImage({
      urls: [this.data.shopImage]
    });
  },
  // 删除店铺图片
  deleteShopImage() {
    this.setData({ shopImage: '' });
  },
  // 粘贴店铺链接
  async pasteShopLink() {
    try {
      const res = await wx.getClipboardData();
      this.setData({ shopLink: res.data });
      wx.showToast({ title: '已粘贴', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '粘贴失败', icon: 'none' });
    }
  },
  canSubmit() { return this.data.title && this.data.minAmount; },
  async createGroupOrder() {
    if (!this.canSubmit()) { wx.showToast({ title: '请填写完整信息', icon: 'none' }); return; }
    wx.showLoading({ title: '创建中...' });
    try {
      const roomId = generateRoomId();
      const data = {
        roomId,
        mode: 'group',
        title: this.data.title,
        minAmount: this.data.minAmount,
        platform: this.data.selectedPlatform,
        shopLink: this.data.shopLink
      };
      // 如果有店铺图片，先上传
      if (this.data.shopImage) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `shop-images/${roomId}-${Date.now()}.jpg`,
          filePath: this.data.shopImage
        });
        data.shopImage = uploadRes.fileID;
      }
      await wx.cloud.callFunction({
        name: 'createRoom',
        data
      });
      wx.hideLoading();
      wx.redirectTo({ url: `/pages/fish-tank/fish-tank?roomId=${roomId}` });
    } catch (err) { 
      wx.hideLoading(); 
      wx.showToast({ title: '创建失败', icon: 'none' });
    }
  }
});
