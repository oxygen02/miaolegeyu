Page({
  data: {
    uploading: false,
    progress: 0,
    currentFile: ''
  },

  // 选择文件夹并上传
  async selectFolder() {
    // 提示用户准备JSON文件
    wx.showModal({
      title: '上传说明',
      content: '请确保已准备好：\n1. 180张猫咪图片\n2. avatarData.json 数据文件\n\n图片将上传到云存储并导入数据库',
      success: (res) => {
        if (res.confirm) {
          this.startUpload();
        }
      }
    });
  },

  // 开始上传流程
  async startUpload() {
    this.setData({ uploading: true, progress: 0 });
    
    try {
      // 1. 读取JSON文件（假设放在本地）
      const avatarData = await this.loadJsonFile();
      
      // 2. 分批上传图片
      const total = avatarData.length;
      const batchSize = 10; // 每批10张
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = avatarData.slice(i, i + batchSize);
        
        // 更新进度
        this.setData({
          currentFile: `正在上传 ${i + 1}-${Math.min(i + batchSize, total)} / ${total}`
        });
        
        // 上传这一批
        await this.uploadBatch(batch);
        
        // 更新进度
        this.setData({
          progress: Math.round((i + batchSize) / total * 100)
        });
      }
      
      wx.showToast({
        title: '上传完成',
        icon: 'success'
      });
      
    } catch (err) {
      console.error('上传失败:', err);
      wx.showToast({
        title: '上传失败',
        icon: 'none'
      });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 加载JSON文件
  loadJsonFile() {
    // 方法1：从本地文件读取（需要用户先选择文件）
    return new Promise((resolve, reject) => {
      // 这里简化处理，实际应该让用户选择JSON文件
      // 或者把JSON数据直接写在代码里
      const avatarData = [
        // 你的180条数据
      ];
      resolve(avatarData);
    });
  },

  // 上传一批图片
  async uploadBatch(batch) {
    for (const item of batch) {
      try {
        // 选择本地文件
        const { tempFiles } = await wx.chooseMessageFile({
          count: 1,
          type: 'image'
        });
        
        if (!tempFiles || tempFiles.length === 0) continue;
        
        // 上传到云存储
        const { fileID } = await wx.cloud.uploadFile({
          cloudPath: item.cloudPath,
          filePath: tempFiles[0].path
        });
        
        console.log('上传成功:', fileID);
        
      } catch (err) {
        console.error('上传失败:', item.name, err);
      }
    }
  }
});
