Page({
  data: {
    uploading: false,
    uploadedCount: 0,
    totalCount: 0,
    currentFile: '',
    category: 'cat',
    avatarList: []
  },

  onLoad() {
    // 页面加载
  },

  // 选择多个文件
  async selectFiles() {
    try {
      const { tempFiles } = await wx.chooseMessageFile({
        count: 100, // 微信限制最多100个
        type: 'image'
      });

      if (!tempFiles || tempFiles.length === 0) {
        wx.showToast({ title: '未选择文件', icon: 'none' });
        return;
      }

      // 保存选择的文件
      const avatarList = tempFiles.map((file, index) => ({
        id: index,
        name: this.extractFileName(file.name),
        path: file.path,
        size: file.size,
        status: 'pending' // pending, uploading, success, error
      }));

      this.setData({
        avatarList,
        totalCount: avatarList.length
      });

      wx.showToast({
        title: `已选择 ${avatarList.length} 个文件`,
        icon: 'success'
      });

    } catch (err) {
      console.error('选择文件失败:', err);
      wx.showToast({ title: '选择失败', icon: 'none' });
    }
  },

  // 提取文件名（不含扩展名）
  extractFileName(fullName) {
    return fullName.replace(/\.[^/.]+$/, '');
  },

  // 分类选择
  onCategoryChange(e) {
    this.setData({
      category: e.detail.value
    });
  },

  // 开始批量上传
  async startUpload() {
    const { avatarList, category } = this.data;

    if (avatarList.length === 0) {
      wx.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    this.setData({ uploading: true, uploadedCount: 0 });

    // 分批上传，每批5个
    const batchSize = 5;
    const total = avatarList.length;

    for (let i = 0; i < total; i += batchSize) {
      const batch = avatarList.slice(i, Math.min(i + batchSize, total));

      this.setData({
        currentFile: `正在上传 ${i + 1}-${Math.min(i + batchSize, total)} / ${total}`
      });

      // 并行上传这一批
      await Promise.all(
        batch.map((item, idx) => this.uploadSingleFile(item, i + idx, category))
      );

      this.setData({
        uploadedCount: Math.min(i + batchSize, total)
      });
    }

    this.setData({ uploading: false });

    // 统计结果
    const successCount = this.data.avatarList.filter(item => item.status === 'success').length;
    wx.showModal({
      title: '上传完成',
      content: `成功: ${successCount} / ${total}`,
      showCancel: false
    });
  },

  // 上传单个文件
  async uploadSingleFile(item, index, category) {
    try {
      // 更新状态为上传中
      this.updateItemStatus(index, 'uploading');

      // 生成云存储路径
      const timestamp = Date.now();
      const ext = item.path.match(/\.[^/.]+$/)?.[0] || '.jpg';
      const cloudPath = `avatars/${category}/${timestamp}_${index}${ext}`;

      // 上传到云存储
      const { fileID } = await wx.cloud.uploadFile({
        cloudPath,
        filePath: item.path
      });

      // 获取临时链接
      const { fileList } = await cloud.getTempFileURL({
        fileList: [fileID]
      });

      const imageUrl = fileList[0]?.tempFileURL || fileID;

      // 添加到数据库
      await wx.cloud.callFunction({
        name: 'addAvatar',
        data: {
          category,
          name: item.name,
          imageUrl,
          cloudPath: fileID
        }
      });

      // 更新状态为成功
      this.updateItemStatus(index, 'success', { fileID, imageUrl });

    } catch (err) {
      console.error(`上传失败 [${item.name}]:`, err);
      this.updateItemStatus(index, 'error', { error: err.message });
    }
  },

  // 更新项目状态
  updateItemStatus(index, status, extraData = {}) {
    const avatarList = this.data.avatarList;
    avatarList[index] = {
      ...avatarList[index],
      status,
      ...extraData
    };
    this.setData({ avatarList });
  },

  // 删除项目
  removeItem(e) {
    const { index } = e.currentTarget.dataset;
    const avatarList = this.data.avatarList.filter((_, i) => i !== index);
    this.setData({
      avatarList,
      totalCount: avatarList.length
    });
  },

  // 清空列表
  clearList() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空已选择的文件列表吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            avatarList: [],
            totalCount: 0,
            uploadedCount: 0
          });
        }
      }
    });
  }
});
