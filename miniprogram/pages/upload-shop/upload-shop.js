const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
    // 表单数据
    name: '',
    cuisine: '',
    cuisineName: '',
    customCuisineName: '',
    cuisineIndex: 0,
    avgPrice: '',
    location: '',
    reason: '',
    notice: '',
    platformUrl: '',
    rating: 3,
    ratingText: '推荐',
    isAnonymous: false,

    // 图片
    images: [],
    maxImages: 6,
    
    // 菜系选项
    cuisineOptions: [
      { id: 'chinese', name: '中餐' },
      { id: 'japanese', name: '日韩餐' },
      { id: 'western', name: '西餐' },
      { id: 'bbq', name: '烧烤' },
      { id: 'hotpot', name: '火锅' },
      { id: 'meat', name: '烤肉' },
      { id: 'seafood', name: '海鲜' },
      { id: 'crayfish', name: '小龙虾' },
      { id: 'local', name: '地方特色' },
      { id: 'dessert', name: '甜品' },
      { id: 'tea', name: '奶茶' },
      { id: 'cafe', name: '咖啡' },
      { id: 'bar', name: '酒吧' },
      { id: 'snack', name: '大排档' }
    ],
    
    // 提交状态
    submitting: false,
    isValid: false
  },

  onLoad() {
    // 初始化评分文字
    this.updateRatingText();
    // 初始化表单验证
    this.checkFormValid();
  },

  // 检查表单是否有效
  checkFormValid() {
    const { name, cuisine, avgPrice, location, images } = this.data;
    const isValid = name.trim() && cuisine && avgPrice.trim() && location.trim() && images.length > 0;
    this.setData({ isValid });
  },

  // 更新评分文字
  updateRatingText() {
    const ratingTexts = ['', '一般', '还行', '推荐', '力荐', '必吃'];
    this.setData({
      ratingText: ratingTexts[this.data.rating] || '推荐'
    });
  },

  // 选择图片
  onChooseImage() {
    const { images, maxImages } = this.data;
    const remainCount = maxImages - images.length;

    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传6张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath);
        this.setData({
          images: [...images, ...newImages]
        });
        this.checkFormValid();
      },
      fail: (err) => {
        if (err.errMsg && (err.errMsg.includes('fail auth') || err.errMsg.includes('cancel'))) {
          wx.showModal({
            title: '需要授权',
            content: '开启相册/相机权限后，可上传店铺图片展示给好友',
            confirmText: '去开启',
            cancelText: '暂不需要',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  // 预览图片
  onPreviewImage(e) {
    e.stopPropagation();
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  onDeleteImage(e) {
    e.stopPropagation();
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    images.splice(index, 1);
    this.setData({ images });
    this.checkFormValid();
  },

  // 输入店铺名称
  onNameInput(e) {
    this.setData({ name: e.detail.value });
    this.checkFormValid();
  },

  // 点击菜系标签
  onCuisineTagTap(e) {
    const { id, name } = e.currentTarget.dataset;
    this.setData({
      cuisine: id,
      cuisineName: name,
      customCuisineName: ''
    });
    this.checkFormValid();
  },

  // 点击自定义菜系
  onCustomCuisineTap() {
    wx.showModal({
      title: '自定义菜系',
      placeholderText: '请输入菜系名称',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content.trim()) {
          this.setData({
            cuisine: 'custom',
            cuisineName: res.content.trim(),
            customCuisineName: res.content.trim()
          });
          this.checkFormValid();
        }
      }
    });
  },

  // 选择菜系（picker 方式，备用）
  onCuisineSelect(e) {
    const index = e.detail.value;
    const cuisine = this.data.cuisineOptions[index];
    this.setData({
      cuisine: cuisine.id,
      cuisineName: cuisine.name,
      cuisineIndex: index
    });
  },

  // 输入价格
  onPriceInput(e) {
    this.setData({ avgPrice: e.detail.value });
    this.checkFormValid();
  },

  // 输入地址
  onLocationInput(e) {
    this.setData({ location: e.detail.value });
    this.checkFormValid();
  },

  // 选择地图位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        let locationName = res.name || '';
        let address = res.address || '';
        let fullLocation = locationName;
        if (address && !locationName.includes(address)) {
          fullLocation = locationName ? `${locationName}（${address}）` : address;
        }
        if (!fullLocation) fullLocation = '未知位置';
        this.setData({ location: fullLocation });
        this.checkFormValid();
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('fail auth')) {
          wx.showModal({
            title: '需要授权',
            content: '开启位置权限后，可自动定位店铺地址，也可手动输入',
            confirmText: '去开启',
            cancelText: '手动输入',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  // 选择评分（点击）
  onRatingSelect(e) {
    const rating = e.currentTarget.dataset.rating;
    this.setData({ rating });
    this.updateRatingText();
  },

  // 评分滑动选择 - 触摸开始
  onRatingTouchStart(e) {
    this.updateRatingByTouch(e);
  },

  // 评分滑动选择 - 触摸移动
  onRatingTouchMove(e) {
    this.updateRatingByTouch(e);
  },

  // 评分滑动选择 - 触摸结束
  onRatingTouchEnd(e) {
    // 触摸结束，可以添加震动反馈等
  },

  // 根据触摸位置更新评分
  updateRatingByTouch(e) {
    const touch = e.touches[0];
    if (!touch) return;

    // 获取 paw-rating 元素的位置信息
    const query = wx.createSelectorQuery();
    query.select('.paw-rating.compact').boundingClientRect((rect) => {
      if (!rect) return;

      const relativeX = touch.clientX - rect.left;
      const itemWidth = rect.width / 5;
      let rating = Math.ceil(relativeX / itemWidth);

      // 限制范围 1-5
      rating = Math.max(1, Math.min(5, rating));

      if (rating !== this.data.rating) {
        this.setData({ rating });
        this.updateRatingText();
      }
    }).exec();
  },

  // 输入推荐理由
  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  // 输入注意事项
  onNoticeInput(e) {
    this.setData({ notice: e.detail.value });
  },

  // 输入平台链接
  onPlatformUrlInput(e) {
    this.setData({ platformUrl: e.detail.value });
  },

  // 匿名开关
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  // 取消
  onCancel() {
    wx.navigateBack();
  },

  // 验证表单
  validateForm() {
    const { name, cuisine, avgPrice, location, images } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入店铺名称', icon: 'none' });
      return false;
    }

    if (!cuisine) {
      wx.showToast({ title: '请选择菜系', icon: 'none' });
      return false;
    }

    if (!avgPrice.trim()) {
      wx.showToast({ title: '请输入人均消费', icon: 'none' });
      return false;
    }

    if (!location.trim()) {
      wx.showToast({ title: '请输入地点', icon: 'none' });
      return false;
    }

    if (images.length === 0) {
      wx.showToast({ title: '请至少上传一张店铺图片', icon: 'none' });
      return false;
    }

    return true;
  },

  // 上传图片到云存储
  async uploadImages() {
    const { images } = this.data;
    const uploadTasks = images.map((imagePath, index) => {
      const cloudPath = `shops/${Date.now()}_${index}.jpg`;
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: imagePath
      });
    });

    try {
      const results = await Promise.all(uploadTasks);
      return results.map(res => res.fileID);
    } catch (err) {
      console.error('上传图片失败:', err);
      throw new Error('上传图片失败');
    }
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) return;
    
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 上传图片
      const imageFileIDs = await this.uploadImages();
      
      // 准备数据
      const shopData = {
        name: this.data.name.trim(),
        cuisine: this.data.cuisine,
        cuisineName: this.data.cuisineName,
        avgPrice: parseInt(this.data.avgPrice) || 0,
        location: this.data.location.trim(),
        reason: this.data.reason.trim(),
        tips: this.data.notice.trim(),
        platformUrl: this.data.platformUrl.trim(),
        rating: this.data.rating,
        images: imageFileIDs,
        isAnonymous: this.data.isAnonymous,
        createTime: new Date().toISOString()
      };

      // 调用云函数创建店铺
      const { result } = await wx.cloud.callFunction({
        name: 'createShop',
        data: shopData
      });

      if (result && result.success) {
        wx.hideLoading();
        wx.showToast({ title: '发布成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result?.error || '发布失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('提交失败:', err);
      wx.showModal({
        title: '发布失败',
        content: err.message || '提交失败，请检查网络或稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
