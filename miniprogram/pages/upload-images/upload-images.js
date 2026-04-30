// 批量上传图片到云存储
const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
    uploadStatus: [],
    isUploading: false,
    progress: 0
  },

  onLoad() {
    // 定义要上传的图片列表
    this.imageList = [
      // 图标
      { local: '/assets/images/about.png', cloud: 'icons/about.png' },
      { local: '/assets/images/history.png', cloud: 'icons/history.png' },
      { local: '/assets/images/setting.png', cloud: 'icons/setting.png' },
      { local: '/assets/images/gexingtouxiang.png', cloud: 'icons/gexingtouxiang.png' },
      { local: '/assets/images/hudong.png', cloud: 'icons/hudong.png' },
      { local: '/assets/images/tuijian.png', cloud: 'icons/tuijian.png' },
      { local: '/assets/images/toupiaojuece.png', cloud: 'icons/toupiaojuece.png' },
      { local: '/assets/images/juze_avatar.png', cloud: 'icons/juze_avatar.png' },
      { local: '/assets/images/daohang.png', cloud: 'icons/daohang.png' },
      { local: '/assets/images/chongxuan.png', cloud: 'icons/chongxuan.png' },
      { local: '/assets/images/gaizhang.png', cloud: 'icons/gaizhang.png' },
      
      // 装饰图
      { local: '/assets/images/cat-fish-logo.png', cloud: 'decorations/cat-fish-logo.png' },
      { local: '/assets/images/loading-cat.png', cloud: 'decorations/loading-cat.png' },
      { local: '/assets/images/cat-decoration.png', cloud: 'decorations/cat-decoration.png' },
      { local: '/assets/images/cat-avatar-icon.png', cloud: 'decorations/cat-avatar-icon.png' },
      { local: '/assets/images/happy-cat-icon.png', cloud: 'decorations/happy-cat-icon.png' },
      { local: '/assets/images/love-cat-icon.png', cloud: 'decorations/love-cat-icon.png' },
      { local: '/assets/images/peeking-cat-icon.png', cloud: 'decorations/peeking-cat-icon.png' },
      { local: '/assets/images/sleeping-cat-icon.png', cloud: 'decorations/sleeping-cat-icon.png' },
      { local: '/assets/images/wink-cat-icon.png', cloud: 'decorations/wink-cat-icon.png' },
      { local: '/assets/images/angry-cat.png', cloud: 'decorations/angry-cat.png' },
      
      // 横幅
      { local: '/assets/images/faqijucan.png', cloud: 'banners/faqijucan.png' },
      { local: '/assets/images/nimenlaiding2.png', cloud: 'banners/nimenlaiding2.png' },
      { local: '/assets/images/yutangpindan.png', cloud: 'banners/yutangpindan.png' },
      { local: '/assets/images/taiyaki-icon.png', cloud: 'banners/taiyaki-icon.png' },
      { local: '/assets/images/maoweiba.png', cloud: 'banners/maoweiba.png' },
      { local: '/assets/images/wotiaohaole1.png', cloud: 'banners/wotiaohaole1.png' },
      { local: '/assets/images/lunbozhanwei.png', cloud: 'banners/lunbozhanwei.png' },
      { local: '/assets/images/lunbozhanwei2.png', cloud: 'banners/lunbozhanwei2.png' },
      
      // 其他
      { local: '/assets/images/singleclaw.png', cloud: 'misc/singleclaw.png' },
      { local: '/assets/images/wxhlfangun.png', cloud: 'misc/wxhlfangun.png' },
      { local: '/assets/images/cat-paw-icon.png', cloud: 'misc/cat-paw-icon.png' },
      { local: '/assets/images/paw-home-icon.png', cloud: 'misc/paw-home-icon.png' },
      { local: '/assets/images/fish-icon.png', cloud: 'misc/fish-icon.png' },
    ];
    
    this.setData({
      uploadStatus: this.imageList.map(img => ({
        name: img.cloud,
        status: 'pending'
      }))
    });
  },

  async startUpload() {
    if (this.data.isUploading) return;
    
    this.setData({ isUploading: true });
    const total = this.imageList.length;
    
    for (let i = 0; i < total; i++) {
      const img = this.imageList[i];
      
      try {
        // 更新状态为上传中
        this.updateStatus(i, 'uploading');
        
        // 上传文件
        const { fileID } = await wx.cloud.uploadFile({
          cloudPath: img.cloud,
          filePath: img.local
        });
        
        // 更新状态为成功
        this.updateStatus(i, 'success', fileID);
        
      } catch (err) {
        console.error(`上传失败 ${img.local}:`, err);
        this.updateStatus(i, 'error', err.message);
      }
      
      // 更新进度
      this.setData({
        progress: Math.round(((i + 1) / total) * 100)
      });
    }
    
    this.setData({ isUploading: false });
    
    wx.showToast({
      title: '上传完成',
      icon: 'success'
    });
  },
  
  updateStatus(index, status, message = '') {
    const uploadStatus = [...this.data.uploadStatus];
    uploadStatus[index] = {
      ...uploadStatus[index],
      status,
      message
    };
    this.setData({ uploadStatus });
  }
});
