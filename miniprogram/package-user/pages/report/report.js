const app = getApp();
const { checkContentWithToast } = require('../../../utils/contentSecurity');

Page({
  data: {
    reportTypes: [
      { value: 'room', label: '普通投票' },
      { value: 'shop', label: '店铺' },
      { value: 'vote', label: '时间投票' },
      { value: 'user', label: '用户' }
    ],
    reportReasons: [
      '色情低俗',
      '政治敏感',
      '暴力恐怖',
      '欺诈诈骗',
      '侵权盗用',
      '垃圾广告',
      '人身攻击',
      '其他违规'
    ],
    typeIndex: -1,
    reasonIndex: -1,
    targetId: '',
    description: '',
    images: [],
    submitting: false
  },

  onLoad(options) {
    // 支持从其他页面传入参数预填
    if (options.type) {
      const typeIndex = this.data.reportTypes.findIndex(t => t.value === options.type);
      if (typeIndex >= 0) {
        this.setData({ typeIndex });
      }
    }
    if (options.targetId) {
      this.setData({ targetId: options.targetId });
    }
  },

  onTypeChange(e) {
    this.setData({ typeIndex: parseInt(e.detail.value) });
  },

  onReasonChange(e) {
    this.setData({ reasonIndex: parseInt(e.detail.value) });
  },

  onTargetIdInput(e) {
    this.setData({ targetId: e.detail.value });
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value });
  },

  // 选择图片
  async chooseImage() {
    if (this.data.images.length >= 3) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' });
      return;
    }

    try {
      const { tempFiles } = await wx.chooseMedia({
        count: 3 - this.data.images.length,
        mediaType: ['image'],
        sourceType: ['album', 'camera']
      });

      wx.showLoading({ title: '上传中...' });

      const uploadTasks = tempFiles.map(file =>
        wx.cloud.uploadFile({
          cloudPath: `reports/${Date.now()}_${Math.random().toString(36).slice(2)}.${file.tempFilePath.split('.').pop()}`,
          filePath: file.tempFilePath
        })
      );

      const results = await Promise.all(uploadTasks);
      const newImages = results.map(r => r.fileID);

      this.setData({
        images: [...this.data.images, ...newImages]
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('上传图片失败:', err);
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  // 删除图片
  removeImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.images
    });
  },

  // 提交举报
  async submitReport() {
    const { typeIndex, reasonIndex, targetId, description, images, submitting } = this.data;

    if (submitting) return;

    if (typeIndex < 0) {
      wx.showToast({ title: '请选择举报类型', icon: 'none' });
      return;
    }

    if (reasonIndex < 0) {
      wx.showToast({ title: '请选择举报原因', icon: 'none' });
      return;
    }

    if (!targetId.trim()) {
      wx.showToast({ title: '请输入被举报对象ID', icon: 'none' });
      return;
    }

    // 内容安全检查：举报描述
    if (description && description.trim()) {
      const isContentSafe = await checkContentWithToast(description.trim());
      if (!isContentSafe) {
        return;
      }
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'submitReport',
        data: {
          type: this.data.reportTypes[typeIndex].value,
          targetId: targetId.trim(),
          reason: this.data.reportReasons[reasonIndex],
          description: description.trim(),
          images
        }
      });

      wx.hideLoading();
      this.setData({ submitting: false });

      if (result.success) {
        wx.showModal({
          title: '提交成功',
          content: '您的举报已提交，我们会尽快处理。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showToast({ title: result.error || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ submitting: false });
      console.error('提交举报失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
  }
});
