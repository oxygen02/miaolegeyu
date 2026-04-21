Page({
  data: { recentRooms: [] },
  onShow() { this.loadRecent(); },
  async loadRecent() {
    try {
      const { result } = await wx.cloud.callFunction({ name: 'getRecentRooms', data: {} });
      if (result.code === 0) this.setData({ recentRooms: result.data || [] });
    } catch(e) { console.log('loadRecent fail', e); }
  },
  goCreate() { wx.navigateTo({ url: '/pages/create/create' }); },
  goJoin() {
    wx.showModal({ title: '提示', content: '请从微信群聊中的小程序卡片进入参与投票', showCancel: false, confirmText: '知道了' });
  },
  enterRoom(e) { wx.navigateTo({ url: `/pages/vote/vote?roomId=${e.currentTarget.dataset.id}` }); },
  viewAllRecent() { wx.navigateTo({ url: '/pages/profile/profile' }); }
});
