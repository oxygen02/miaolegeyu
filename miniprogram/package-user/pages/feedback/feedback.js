const { imagePaths } = getApp().globalData;
const { checkContentWithToast } = require('../../../utils/contentSecurity');

Page({
  data: {
    imagePaths,
    feedbackTypes: [
      { value: 'bug', label: '功能异常', icon: '🐛' },
      { value: 'feature', label: '功能建议', icon: '💡' },
      { value: 'ui', label: '界面问题', icon: '🎨' },
      { value: 'performance', label: '卡顿闪退', icon: '🐌' },
      { value: 'other', label: '其他', icon: '📝' }
    ],
    selectedType: '',
    content: '',
    contact: '',
    canSubmit: false,
    submitting: false
  },

  onLoad() {
    this.setData({ imagePaths: getApp().globalData.imagePaths });
  },

  selectType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ selectedType: type });
    this.checkCanSubmit();
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
    this.checkCanSubmit();
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  checkCanSubmit() {
    const { selectedType, content } = this.data;
    this.setData({ canSubmit: selectedType && content.trim().length > 0 });
  },

  async submitFeedback() {
    const { selectedType, content, contact } = this.data;
    
    if (!selectedType || !content.trim()) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    // 内容安全检查
    const isContentSafe = await checkContentWithToast(content.trim());
    if (!isContentSafe) {
      return;
    }

    this.setData({ submitting: true });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'submitFeedback',
        data: {
          type: selectedType,
          content: content.trim(),
          contact: contact.trim(),
          userInfo: getApp().globalData.auth.getUserInfo(),
          systemInfo: wx.getSystemInfoSync(),
          createTime: new Date().toISOString()
        }
      });

      if (result.success) {
        wx.showToast({ title: '反馈成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        wx.showToast({ title: result.msg || '提交失败', icon: 'none' });
      }
    } catch (err) {
      console.error('提交反馈失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  }
});