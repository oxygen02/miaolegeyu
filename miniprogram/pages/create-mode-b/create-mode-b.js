// pages/create-mode-b/create-mode-b.js
const { generateRoomId } = require('../../utils/uuid.js');

Page({
  data: {
    title: '',
    location: {},
    deadlineText: '',
    deadline: null,
    timeRange: [
      ['今天', '明天', '后天'],
      ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']
    ],
    timeIndex: [0, 6]
  },

  onLoad() {
    this.updateDeadlineText();
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          location: {
            name: res.name,
            address: res.address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      }
    });
  },

  onTimeChange(e) {
    const index = e.detail.value;
    this.setData({ timeIndex: index }, () => {
      this.updateDeadlineText();
    });
  },

  updateDeadlineText() {
    const [dayIndex, timeIndex] = this.data.timeIndex;
    const day = this.data.timeRange[0][dayIndex];
    const time = this.data.timeRange[1][timeIndex];
    this.setData({
      deadlineText: `${day} ${time}`,
      deadline: this.calculateDeadline(dayIndex, time)
    });
  },

  calculateDeadline(dayIndex, timeStr) {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + dayIndex);
    const [hour, minute] = timeStr.split(':').map(Number);
    deadline.setHours(hour, minute, 0, 0);
    return deadline;
  },

  canSubmit() {
    return this.data.title.trim() !== '' && this.data.location.name;
  },

  async createRoom() {
    if (!this.canSubmit()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });

    try {
      const roomId = generateRoomId();
      const { result } = await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          roomId,
          mode: 'b',
          title: this.data.title,
          location: this.data.location,
          voteDeadline: this.data.deadline
        }
      });

      wx.hideLoading();

      if (result.success) {
        wx.redirectTo({
          url: `/pages/control/control?roomId=${roomId}`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '创建失败：' + err.message, icon: 'none' });
    }
  }
});
