const { imagePaths } = require('../../config/imageConfig');
const app = getApp();

Page({
  data: {
    imagePaths: {},
    totalAmount: 268,
    peopleCount: 4,
    perPerson: 67,
    members: [],
    paidCount: 2,
    allPaid: false
  },
  async onLoad() {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    // 使用已解析的路径初始化成员头像（避免 cloud:// 泄漏到渲染层）
    const resolved = this.data.imagePaths;
    const defaultAvatar = (resolved.icons && resolved.icons.juzeAvatar) || '';
    this.setData({
      members: [
        { id: 1, name: '我', paid: true, avatar: defaultAvatar },
        { id: 2, name: '张三', paid: false, avatar: defaultAvatar },
        { id: 3, name: '李四', paid: false, avatar: defaultAvatar },
        { id: 4, name: '王五', paid: true, avatar: defaultAvatar }
      ]
    });
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
