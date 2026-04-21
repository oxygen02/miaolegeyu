Page({
  data: {
    totalAmount: 268,
    peopleCount: 4,
    perPerson: 67,
    members: [
      { id: 1, name: '我', paid: true, avatar: '/assets/images/juze_avatar.png' },
      { id: 2, name: '张三', paid: false, avatar: '/assets/images/juze_avatar.png' },
      { id: 3, name: '李四', paid: false, avatar: '/assets/images/juze_avatar.png' },
      { id: 4, name: '王五', paid: true, avatar: '/assets/images/juze_avatar.png' }
    ],
    paidCount: 2,
    allPaid: false
  },
  onLoad() {
    this.updateStatus();
  },
  updateStatus() {
    const paidCount = this.data.members.filter(m => m.paid).length;
    const allPaid = paidCount === this.data.members.length;
    this.setData({ paidCount, allPaid });
  },
  togglePaid(e) {
    const id = e.currentTarget.dataset.id;
    const members = this.data.members.map(item =>
      item.id === id ? { ...item, paid: !item.paid } : item
    );
    this.setData({ members }, () => {
      this.updateStatus();
    });
  },
  settleUp() {
    if (this.data.allPaid) {
      wx.showToast({ title: '已全部结清', icon: 'success' });
      return;
    }
    wx.showModal({
      title: '确认结算',
      content: '是否确认完成结算？',
      success: (res) => {
        if (res.confirm) {
          const members = this.data.members.map(item => ({ ...item, paid: true }));
          this.setData({ members }, () => {
            this.updateStatus();
            wx.showToast({ title: '结算完成', icon: 'success' });
          });
        }
      }
    });
  }
});
