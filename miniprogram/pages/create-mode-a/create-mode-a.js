Page({
  data: {
    posters: [],
    showPlatformPopup: false,
    selectedPlatform: '',
    editingPosterIndex: -1,
    title: '',
    location: '',
    peopleCount: '',
    deadlineText: '',
    timeAuxiliary: false,
    groupOrderOption: false,
    canCreate: false,
    timeRange: [
      ['今天', '明天', '后天'],
      ['12:00', '14:00', '18:00', '19:00', '20:00', '21:00']
    ]
  },

  onLoad() {},

  updateCanCreate() {
    const { posters, title } = this.data;
    const canCreate = posters.length >= 2 && title.trim() !== '';
    this.setData({ canCreate });
  },

  addPoster() {
    wx.chooseMedia({
      count: 6 - this.data.posters.length,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const newPosters = res.tempFiles.map(file => ({
          tempFilePath: file.tempFilePath,
          platformSource: ''
        }));
        this.setData({
          posters: [...this.data.posters, ...newPosters]
        }, () => {
          this.updateCanCreate();
        });
      }
    });
  },

  markPlatform(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      showPlatformPopup: true,
      editingPosterIndex: index,
      selectedPlatform: this.data.posters[index].platformSource || ''
    });
  },

  selectPlatform(e) {
    this.setData({ selectedPlatform: e.currentTarget.dataset.platform });
  },

  confirmPlatform() {
    const { editingPosterIndex, selectedPlatform } = this.data;
    if (editingPosterIndex >= 0 && selectedPlatform) {
      this.setData({
        [`posters[${editingPosterIndex}].platformSource`]: selectedPlatform,
        showPlatformPopup: false,
        editingPosterIndex: -1
      });
    }
  },

  closePopup() {
    this.setData({ showPlatformPopup: false });
  },

  removePoster(e) {
    const { index } = e.currentTarget.dataset;
    const posters = [...this.data.posters];
    posters.splice(index, 1);
    this.setData({ posters }, () => {
      this.updateCanCreate();
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value }, () => {
      this.updateCanCreate();
    });
  },

  onLocationInput(e) { this.setData({ location: e.detail.value }); },
  onPeopleInput(e) { this.setData({ peopleCount: e.detail.value }); },

  onDeadlineChange(e) {
    const [dayIdx, timeIdx] = e.detail.value;
    const days = this.data.timeRange[0];
    const times = this.data.timeRange[1];
    this.setData({ deadlineText: `${days[dayIdx]} ${times[timeIdx]}` });
  },

  onTimeAuxiliaryChange(e) { this.setData({ timeAuxiliary: e.detail.value }); },
  onGroupOrderChange(e) { this.setData({ groupOrderOption: e.detail.value }); },

  async createRoom() {
    const { title, posters, deadlineText, timeAuxiliary, groupOrderOption } = this.data;

    if (posters.length < 2) {
      wx.showToast({ title: '至少上传2张海报', icon: 'none' });
      return;
    }

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中' });

    try {
      const uploadedPosters = await Promise.all(
        posters.map(async (p) => {
          if (p.imageUrl) return p;
          const { fileID } = await wx.cloud.uploadFile({
            cloudPath: `posters/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
            filePath: p.tempFilePath
          });
          return { imageUrl: fileID, platformSource: p.platformSource };
        })
      );

      const { result } = await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          title,
          mode: 'pick_for_them',
          candidatePosters: uploadedPosters,
          voteDeadline: this.parseDeadline(deadlineText),
          timeAuxiliary,
          groupOrderOption
        }
      });

      if (result.code !== 0) throw new Error(result.msg);

      wx.hideLoading();
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
      wx.redirectTo({ url: `/pages/control/control?roomId=${result.data.roomId}` });

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '创建失败', icon: 'none' });
    }
  },

  parseDeadline(text) {
    if (!text) return new Date(Date.now() + 24 * 3600 * 1000);
    return new Date(Date.now() + 24 * 3600 * 1000);
  }
});
