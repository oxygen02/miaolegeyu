const { imagePaths } = getApp().globalData;
const app = getApp();
const { checkContentWithToast, checkImageWithToast } = require('../../../utils/contentSecurity');

Page({
  data: {
    imagePaths: {},
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
    isValid: false,

    // AI识别状态
    isRecognizing: false,
    recognitionStatus: '',
    recognitionProgress: 0,
    aiResult: null,
    showAIHint: false,  // AI提示气泡显示状态

    // 编辑模式
    isEditMode: false,
    editShopId: '',
    existingImageIds: []  // 编辑时保留的原始图片ID
  },

  async onLoad(options) {
    const resolvedPaths = await app.whenImageReady();
    this.setData({ imagePaths: resolvedPaths });
    // 初始化评分文字
    this.updateRatingText();

    // 编辑模式：加载已有店铺数据
    if (options && options.mode === 'edit' && options.shopId) {
      this.setData({ isEditMode: true, editShopId: options.shopId });
      await this.loadShopForEdit(options.shopId);
    }

    // 初始化表单验证
    this.checkFormValid();
  },

  // 加载店铺数据用于编辑
  async loadShopForEdit(shopId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'getMyShops'
      });
      if (result && result.success && result.shops) {
        const shop = result.shops.find(s => s._id === shopId);
        if (shop) {
          // 图片需要从 fileID 转为临时路径用于显示
          let imageTempPaths = [];
          if (shop.images && shop.images.length > 0) {
            imageTempPaths = shop.images; // CDN 直链可直接使用
          }
          this.setData({
            name: shop.name || '',
            cuisine: shop.cuisine || '',
            cuisineName: shop.cuisineName || '',
            avgPrice: String(shop.avgPrice || ''),
            location: shop.location || '',
            reason: shop.reason || '',
            notice: shop.notice || shop.tips || '',
            platformUrl: shop.platformUrl || '',
            rating: shop.rating || 3,
            images: imageTempPaths,
            existingImageIds: shop.images || [], // 保留原有图片ID，提交时复用
            isAnonymous: shop.isAnonymous || false
          });
          this.updateRatingText();
          this.checkFormValid();
          // 修改页面标题
          wx.setNavigationBarTitle({ title: '编辑店铺' });
        } else {
          wx.showToast({ title: '未找到该店铺', icon: 'none' });
        }
      }
    } catch (err) {
      console.error('加载店铺数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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

  // 选择图片 - 添加大小和格式校验
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
        
        // 校验图片大小（限制5MB）
        const MAX_SIZE = 5 * 1024 * 1024;
        const oversizedFiles = res.tempFiles.filter(file => file.size > MAX_SIZE);
        if (oversizedFiles.length > 0) {
          wx.showToast({ 
            title: `有${oversizedFiles.length}张图片超过5MB，请压缩后重试`, 
            icon: 'none',
            duration: 3000
          });
          return;
        }
        
        this.setData({
          images: [...images, ...newImages]
        });
        this.checkFormValid();
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({ title: '选择图片失败', icon: 'none' });
      }
    });
  },

  // 预览图片
  onPreviewImage(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    const { index } = e.currentTarget.dataset;
    const { images } = this.data;
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 删除图片
  onDeleteImage(e) {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
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
            content: '请选择位置权限以使用地图功能',
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
    if (this.data.isEditMode) {
      // 编辑模式：返回个人中心
      wx.reLaunch({ url: '/pages/profile/profile' });
    } else {
      // 创建模式：正常返回上一页
      wx.navigateBack();
    }
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
    
    if (!images || images.length === 0) {
      throw new Error('没有选择图片');
    }
    
    const uploadPromises = [];
    
    for (let index = 0; index < images.length; index++) {
      const imagePath = images[index];
      
      try {
        // 检查文件是否存在
        const fs = wx.getFileSystemManager();
        await new Promise((resolve, reject) => {
          fs.access({
            path: imagePath,
            success: () => resolve(true),
            fail: (err) => reject(err)
          });
        });
        
        const cloudPath = `shops/${Date.now()}_${index}.jpg`;
        
        // ✅ 关键修复：将uploadFile包装在Promise中
        const uploadPromise = new Promise((resolve, reject) => {
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: imagePath,
            success: (res) => {
              if (res.fileID && typeof res.fileID === 'string') {
                resolve(res);  // ✅ 正确地resolve，传递fileID
              } else {
                reject(new Error('上传成功但未获得有效的fileID'));
              }
            },
            fail: (err) => {
              console.error(`❌ 图片${index + 1}上传失败:`, err);
              reject(err);  // ✅ 正确地reject错误
            }
          });
        });
        
        uploadPromises.push(uploadPromise);
        
      } catch (err) {
        console.error(`❌ 图片${index + 1}处理异常:`, err);
        throw new Error(`第${index + 1}张图片上传失败：${err.errMsg || err.message || '未知错误'}`);
      }
    }

    try {
      const results = await Promise.all(uploadPromises);
      
      // 提取所有fileID并验证
      const fileIDs = results.map(res => res.fileID).filter(id => id && id !== 'undefined' && id !== '');
      
      if (fileIDs.length !== results.length) {
        throw new Error(`部分图片fileID无效（${results.length - fileIDs.length}/${results.length}张）`);
      }
      
      return fileIDs;
    } catch (err) {
      console.error('❌ 批量上传失败:', err);
      throw err;  // 直接抛出原始错误
    }
  },

  // 提交表单
  async onSubmit() {
    if (!this.validateForm()) return;

    // 内容安全检查
    const { name, location, reason, notice } = this.data;
    const contentToCheck = [name, location, reason, notice].filter(Boolean).join(' ');
    const isContentSafe = await checkContentWithToast(contentToCheck);
    if (!isContentSafe) {
      return;
    }
    
    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 上传图片
      let imageFileIDs = [];
      try {
        imageFileIDs = await this.uploadImages();
        console.log('✅ 图片上传完成，获得fileIDs:', imageFileIDs);
        
        // 图片内容安全检测
        wx.showLoading({ title: '图片检测中...', mask: true });
        for (const fileID of imageFileIDs) {
          const isImageSafe = await checkImageWithToast(fileID);
          if (!isImageSafe) {
            // 删除已上传的违规图片
            try {
              await wx.cloud.deleteFile({ fileList: imageFileIDs });
            } catch (e) {}
            throw new Error('图片包含违规内容，已删除');
          }
        }
        wx.hideLoading();
        
        // 验证上传结果
        if (!imageFileIDs || imageFileIDs.length === 0) {
          throw new Error('图片上传后未获得有效文件ID');
        }
        
        // 检查每个fileID是否有效（不是undefined或空字符串）
        const invalidIDs = imageFileIDs.filter(id => !id || id === 'undefined' || id === '');
        if (invalidIDs.length > 0) {
          console.warn('⚠️ 发现无效的fileID:', invalidIDs);
          throw new Error(`有${invalidIDs.length}张图片上传失败，请重试`);
        }
        
      } catch (uploadErr) {
        console.error('❌ 图片上传失败:', uploadErr);
        
        // 特殊处理：云存储权限问题
        if (uploadErr.errMsg && uploadErr.errMsg.includes('permission denied')) {
          throw new Error(
            '⚠️ 云存储权限被拒绝\n\n' +
            '原因：小程序没有云存储写入权限\n\n' +
            '解决方案：\n' +
            '1. 打开微信开发者工具\n' +
            '2. 进入「云开发控制台」\n' +
            '3. 左侧选择「存储」\n' +
            '4. 点击「权限设置」\n' +
            '5. 将权限改为「所有用户可读写」\n' +
            '6. 或添加自定义安全规则允许写入\n\n' +
            '详细错误：' + (uploadErr.errMsg || '')
          );
        }
        
        throw uploadErr;
      }
      
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
        images: imageFileIDs,  // 确保使用有效的fileIDs
        isAnonymous: this.data.isAnonymous
      };

      let result;
      if (this.data.isEditMode) {
        // 编辑模式：调用更新云函数
        shopData.shopId = this.data.editShopId;
        const callRes = await wx.cloud.callFunction({
          name: 'updateShop',
          data: shopData
        });
        result = callRes.result;
      } else {
        // 创建模式
        shopData.createTime = new Date().toISOString();
        const callRes = await wx.cloud.callFunction({
          name: 'createShop',
          data: shopData
        });
        result = callRes.result;
      }

      if (result && result.success) {
        wx.hideLoading();
        wx.showToast({ title: this.data.isEditMode ? '✨ 修改成功' : '✨ 发布成功', icon: 'success' });
        
        // 通知父页面（food-discovery）刷新列表
        setTimeout(() => {
          try {
            const pages = getCurrentPages();
            if (pages.length >= 2) {
              const parentPage = pages[pages.length - 2];  // 上一个页面
              
              // 检查是否是food-discovery页面
              if (parentPage && parentPage.route && parentPage.route.includes('food-discovery')) {
                console.log('🔄 通知父页面刷新店铺列表...');
                
                // 调用父页面的刷新方法
                if (typeof parentPage.loadShops === 'function') {
                  parentPage.loadShops();  // 重新加载店铺数据
                } else if (typeof parentPage.onShow === 'function') {
                  parentPage.onShow();  // 触发onShow生命周期
                } else if (parentPage.setData) {
                  // 最后的兜底：设置一个标记让父页面onShow时检查
                  parentPage.setData({
                    needRefresh: true,
                    _lastRefreshTime: Date.now()
                  });
                }
              }
            }
          } catch (notifyErr) {
            console.warn('⚠️ 通知父页面刷新失败:', notifyErr);
            // 不影响返回操作
          }
          
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result?.error || '发布失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('提交失败:', err);
      console.error('错误详情:', err.errMsg || err.message);
      
      // 根据错误类型提供更友好的提示
      let errorTitle = '发布失败';
      let errorContent = err.message || '提交失败，请检查网络或稍后重试';
      
      if (err.message && err.message.includes('图片')) {
        errorTitle = '⚠️ 图片上传失败';
        errorContent = err.message + '\n\n可能原因：\n1. 网络连接不稳定\n2. 图片文件过大（建议小于5MB）\n3. 云存储空间不足\n\n建议：请稍后重试或更换网络';
      } else if (err.errMsg && err.errMsg.includes('uploadFile:fail')) {
        errorTitle = '📤 上传异常';
        errorContent = '图片上传到云端失败，可能是：\n• 网络问题\n• 文件权限问题\n• 云存储配置错误\n\n请检查控制台详细信息';
      }
      
      wx.showModal({
        title: errorTitle,
        content: errorContent,
        showCancel: false,
        confirmText: '我知道了'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ========== AI智能识别功能 ==========

  // 菜系关键词映射表（定义为常量避免this作用域问题）
  _cuisineKeywords: {
    'chinese': ['中餐', '家常菜', '炒菜', '川菜', '粤菜', '湘菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜', '东北菜', '西北菜', '本帮菜'],
    'japanese': ['日料', '日本料理', '寿司', '刺身', '拉面', '日式', '居酒屋', '和牛', '天妇罗', '寿喜烧', '韩国料理', '韩餐', '烤肉', '泡菜', '石锅拌饭', '部队锅'],
    'western': ['西餐', '牛排', '披萨', '意面', '沙拉', '汉堡', '三明治', '法餐', '意大利菜', '美式', '欧式'],
    'bbq': ['烧烤', 'BBQ', '串', '烤串', '羊肉串', '烤翅', '生蚝', '铁板烧'],
    'hotpot': ['火锅', '涮肉', '麻辣烫', '冒菜', '串串香', '潮汕牛肉', '猪肚鸡', '椰子鸡', '打边炉', '鸡煲'],
    'meat': ['烤肉', '韩式烤肉', '日式烤肉', '巴西烤肉', '炭火烤肉', '自助烤肉'],
    'seafood': ['海鲜', '大闸蟹', '龙虾', '鲍鱼', '扇贝', '生蚝', '海胆', '鱼市', '渔港'],
    'crayfish': ['小龙虾', '麻辣小龙虾', '十三香', '蒜蓉虾', '油焖虾'],
    'local': ['地方特色', '特色菜', '土菜', '农家乐', '私房菜', '创意菜', '融合菜'],
    'dessert': ['甜品', '蛋糕', '面包', '冰淇淋', '奶茶店', '糖水', '杨枝甘露', '双皮奶', '蛋挞'],
    'tea': ['奶茶', '茶饮', '果茶', '喜茶', '奈雪', '茶颜悦色', '一点点', 'CoCo', '贡茶'],
    'cafe': ['咖啡', '咖啡馆', '咖啡厅', '星巴克', '瑞幸', '拿铁', '卡布奇诺', '美式'],
    'bar': ['酒吧', '清吧', '夜店', '鸡尾酒', '威士忌', '啤酒屋', '精酿']
  },

  // 短按显示AI提示
  onAIShowHint() {
    // 显示提示气泡
    this.setData({ showAIHint: true });
    
    // 1.5秒后自动隐藏（与CSS动画时长一致）
    setTimeout(() => {
      this.setData({ showAIHint: false });
    }, 1500);
  },

  // 触发AI识别（长按）
  async onAIRecognize() {
    const { images } = this.data;
    if (!images || images.length === 0) {
      wx.showToast({ title: '请先上传图片', icon: 'none' });
      return;
    }

    this.setData({
      isRecognizing: true,
      recognitionStatus: '正在分析图片...',
      recognitionProgress: 20,
      aiResult: null
    });

    try {
      const imagePath = images[0];

      await new Promise(resolve => setTimeout(resolve, 500));
      this.setData({
        recognitionStatus: '正在识别文字...',
        recognitionProgress: 40
      });

      let ocrText = '';
      try {
        ocrText = await this.callCloudOCR(imagePath);
      } catch (ocrErr) {
        console.error('❌ 云函数OCR失败:', ocrErr);
        
        // 根据错误类型提供更友好的提示
        let errorMessage = 'AI识别服务暂时不可用';
        let errorDetail = '请稍后重试或手动填写店铺信息';
        
        if (ocrErr.message && ocrErr.message.includes('配额')) {
          errorMessage = '⚠️ OCR免费次数已用完';
          errorDetail = '今日/本月识别次数已达上限，可手动填写或明天再试';
        } else if (ocrErr.message && ocrErr.message.includes('超时')) {
          errorMessage = '⏰ 识别响应超时';
          errorDetail = '网络较慢，请检查网络后重试';
        } else if (ocrErr.errMsg && ocrErr.errMsg.includes('not enough market quota')) {
          errorMessage = '⚠️ 微信OCR配额已用完';
          errorDetail = '本月免费额度已耗尽，建议手动填写信息';
        }
        
        throw new Error(`${errorMessage}\n${errorDetail}`);
      }
      
      // 检测OCR结果是否为空
      if (!ocrText || ocrText.trim().length === 0) {
        throw new Error('⚠️ 未识别到文字\n请确保图片中包含清晰的文字信息，如店铺名称、地址等。建议上传美团或大众点评的截图。');
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      this.setData({
        recognitionStatus: '正在提取信息...',
        recognitionProgress: 70
      });

      const extractedInfo = this.extractShopInfo(ocrText);

      await new Promise(resolve => setTimeout(resolve, 200));
      this.setData({
        recognitionStatus: '完成！',
        recognitionProgress: 100,
        isRecognizing: false,
        aiResult: extractedInfo
      });

      this.autoFillForm(extractedInfo);

      wx.showToast({
        title: '✨ 识别成功',
        icon: 'success',
        duration: 1500
      });

    } catch (err) {
      console.error('AI识别失败:', err);
      this.setData({
        isRecognizing: false,
        recognitionStatus: '',
        recognitionProgress: 0
      });
      
      // 使用错误信息作为弹窗内容，如果没有则使用默认提示
      const errorContent = err.message || '无法自动识别，请手动填写。提示：上传清晰的店铺招牌或美团/大众点评截图效果更好。';
      
      wx.showModal({
        title: '⚠️ 识别失败',
        content: errorContent,
        showCancel: false,
        confirmText: '我知道了'
      });
    }
  },

  // 调用云函数OCR（如果已配置）
  async callCloudOCR(imagePath) {
    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();
      console.log('📖 开始读取图片文件...');
      
      fs.readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          wx.cloud.callFunction({
            name: 'recognizeShop',
            data: {
              imageBase64: res.data
            },
            timeout: 25000, // 设置25秒超时（比云函数20秒稍长）
            success: (cloudRes) => {
              if (cloudRes.result && cloudRes.result.code === 0) {
                const rawData = cloudRes.result.data || [];
                
                // 兼容两种数据格式：
                // 格式1: 字符串数组 ["文本1", "文本2"] (腾讯云OCR已处理)
                // 格式2: 对象数组 [{DetectedText: "文本1"}] (原始API返回)
                let ocrText = '';
                
                if (rawData.length > 0 && typeof rawData[0] === 'string') {
                  // 格式1：直接拼接
                  ocrText = rawData.join('\n');
                } else if (rawData.length > 0 && typeof rawData[0] === 'object') {
                  // 格式2：提取DetectedText字段
                  ocrText = rawData.map(item => item.DetectedText || item.text || '').join('\n');
                } else {
                  ocrText = String(rawData);
                }
                
                resolve(ocrText);
              } else {
                // 构造包含详细信息的错误对象
                const error = new Error(cloudRes.result?.error || 'OCR调用失败');
                error.isQuotaExceeded = cloudRes.result?.isQuotaExceeded || false;
                error.detail = cloudRes.result?.detail || '';
                error.method = cloudRes.result?.method || 'unknown';
                console.error('❌ OCR返回错误:', cloudRes.result);
                reject(error);
              }
            },
            fail: (err) => {
              console.error('❌ 云函数调用失败:', err);
              console.error('错误代码:', err.errCode);
              console.error('错误信息:', err.errMsg);
              reject(err);
            }
          });
        },
        fail: (err) => {
          console.error('❌ 图片读取失败:', err);
          reject(new Error('无法读取图片文件'));
        }
      });
    });
  },

  // 从OCR文本中提取店铺信息（增强版）
  extractShopInfo(ocrText) {
    console.log('=== 开始提取店铺信息 ===');
    console.log('OCR原始文本:', ocrText.substring(0, 300));

    const lines = ocrText.split('\n').filter(line => line.trim());
    const fullText = lines.join(' ');
    
    console.log('文本行数:', lines.length);
    console.log('前5行内容:', lines.slice(0, 5));

    let name = '';
    let address = '';
    let cuisine = '';
    let cuisineName = '';
    let price = '';

    // ========== 1. 提取店名（最关键）==========
    
    // 预处理：过滤掉undefined和空值
    const cleanLines = lines.filter(line => line && line.trim() && line !== 'undefined');
    
    // ⭐ 核心原理：店名的视觉特征
    // 1. 位置：在图片上端 → OCR返回的前几行
    // 2. 字体：最大最醒目 → 识别到的文字最长
    // 3. 内容：品牌名 + 菜品类型
    // 4. 排除：数字、时间、评分等
    
    // ========== 策略0（最高优先级）：基于视觉特征的综合评分 ==========

    // 扩大搜索范围到前20行（复合店名可能在稍后的位置）
    const topRegionLines = cleanLines.slice(0, Math.min(20, cleanLines.length));
    
    // 常见菜品后缀（用于识别店名）
    const cuisineSuffixes = ['龙虾', '火锅', '烧烤', '烤肉', '料理', '川菜', '粤菜',
                           '日料', '西餐', '自助', '海鲜', '湘菜', '东北菜', '西北菜',
                           '江浙菜', '私房菜', '农家菜', '小吃', '快餐', '面馆',
                           '粥店', '饺子', '串串', '麻辣烫', '冒菜', '鸡煲',
                           '打边炉', '鱼庄', '酒楼', '食府', '餐厅', '饭店'];
    
    // 品牌关键词库
    const brandKeywords = ['方盐', '海底捞', '星巴克', '喜茶', '奈雪', '肯德基', 
                          '麦当劳', '必胜客', '呷哺', '鼎泰丰', '绿茶', '外婆家',
                          '太二', '探鱼', '木屋', '胡桃里', '西贝', '胖哥俩',
                          '乐记', '文和友', '巴奴', '凑凑', '哥老官', '点都德',
                          '陶陶居', '松鹤楼', '全聚德', '虾无界', '小龙坎', '大龙燚'];
    
    let bestCandidate = null;
    let bestScore = -Infinity;

    console.log(`\n📊 开始对前${topRegionLines.length}行进行视觉特征评分...`);
    
    for (let i = 0; i < topRegionLines.length; i++) {
      const line = topRegionLines[i].trim();
      if (!line || line.length < 2) continue;
      
      let score = 0;
      const reasons = [];
      
      // ===== 特征1: 文字长度（最重要！字体越大→文字越长）=====
      // 店名字体通常是图片中最大的，所以识别出的字符数最多
      const lengthScore = line.length * 3;  // 每个字符3分
      score += lengthScore;
      reasons.push(`长度${line.length}字(+${lengthScore})`);
      
      // ===== 特征2: 位置靠前（图片上端）=====
      // 店名通常在最顶部，前10行高权重，后10行低权重
      const positionScore = i < 10 ? (10 - i) * 4 : Math.max(0, (20 - i) * 1.5);
      score += positionScore;
      reasons.push(`位置第${i+1}行(+${positionScore.toFixed(0)})`);
      
      // ===== 特征3: 中文字符比例（店名几乎全是中文）=====
      const chineseChars = (line.match(/[\u4e00-\u9fa5]/g) || []).length;
      const chineseRatio = chineseChars / line.length;
      const chineseScore = chineseRatio * 25;
      score += chineseScore;
      reasons.push(`中文占比${(chineseRatio*100).toFixed(0)}%(+${chineseScore.toFixed(0)})`);
      
      // ===== 特征4: 包含品牌关键词（强信号！）=====
      for (const brand of brandKeywords) {
        if (line.includes(brand)) {
          score += 50;  // 品牌名大幅加分
          reasons.push(`✨ 品牌"${brand}"(+50)`);
          break;
        }
      }
      
      // ===== 特征5: 包含菜品后缀（可累计多个！）=====
      let cuisineMatchCount = 0;
      const matchedCuisines = [];
      for (const suffix of cuisineSuffixes) {
        if (line.includes(suffix)) {
          cuisineMatchCount++;
          matchedCuisines.push(suffix);
          score += 35;  // 每个菜品类型都加分
        }
      }
      
      // 如果有多个菜品类型，额外加分（说明这是完整店名）
      if (cuisineMatchCount >= 2) {
        const bonusScore = (cuisineMatchCount - 1) * 20;  // 额外奖励
        score += bonusScore;
        reasons.push(`🍽️ 多菜品(${matchedCuisines.join('+')}) +${35 * cuisineMatchCount + bonusScore}`);
      } else if (cuisineMatchCount === 1) {
        reasons.push(`🍽️ 菜品"${matchedCuisines[0]}"(+35)`);
      }
      
      // ===== 特征5.5: 店名中的分隔符（·、-、空格连接多个词）=====
      const separators = line.match(/[·\-\s]/g);
      if (separators && separators.length >= 2) {
        // 有2个以上的分隔符，说明是复合店名（如"A·B·C"）
        score += 20;
        reasons.push(`📝 复合店名格式(+20)`);
      } else if (separators && separators.length === 1) {
        score += 10;
        reasons.push(`📝 含分隔符(+10)`);
      }
      
      // ===== 特征6: 包含括号分店名（如"(东郊记忆店)"）=====
      if (/[\(（].{2,20}[\)）]$/.test(line)) {
        score += 25;
        reasons.push('📍 分店名(+25)');
      }
      
      // ===== 惩罚项：明确不是店名的特征 =====
      
      // 纯数字（如"78"、"4464"）
      if (/^\d+$/.test(line)) {
        score -= 100;
        reasons.push('❌ 纯数字(-100)');
      }
      
      // 时间格式（如"14:43"、"11:00-14:00"）
      if (/^\d{1,2}:\d{2}/.test(line)) {
        score -= 80;
        reasons.push('❌ 时间格式(-80)');
      }
      
      // 评价/评分类（如"评价(4464)"、"4.8分"）
      if (this.isNonShopInfo(line)) {
        score -= 90;
        reasons.push(`❌ 非店名信息(-90)`);
      }
      
      // 太短（<3个字符不太可能是完整店名）
      if (line.length < 3) {
        score -= 40;
        reasons.push('⚠️ 过短(-40)');
      }
      
      // 太长（>45个字符可能是一句话）
      if (line.length > 45) {
        score -= 20;
        reasons.push('⚠️ 过长(-20)');
      }
      
      // 英文字母过多（可能是网址、代码等）
      const englishRatio = (line.match(/[a-zA-Z]/g) || []).length / line.length;
      if (englishRatio > 0.5) {
        score -= 60;
        reasons.push('❌ 英文过多(-60)');
      }
      
      console.log(`  [第${i+1}行] ${score.toFixed(0)}分: ${line.substring(0, 40)}${line.length > 40 ? '...' : ''}`);
      console.log(`         原因: ${reasons.join(', ')}`);
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = line;
      }
    }
    
    // 使用得分最高的候选作为店名
    if (bestCandidate && bestScore > 20) {  // 设置最低阈值
      name = this.cleanShopName(bestCandidate);
      console.log(`\n✅ 策略0-视觉特征选择: "${name}" (${bestScore.toFixed(0)}分)`);
    }

    // ========== 策略0.5：全局复合店名搜索（针对"品牌·多菜品"格式）==========
    // 有些复合店名（如"虾无界龙虾·江湖菜·烧烤"）可能在较后的位置
    console.log('\n🔍 开始全局复合店名搜索...');
    let globalBestCandidate = null;
    let globalBestScore = 0;

    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      if (!line || line.length < 6 || line.length > 30) continue;

      let compoundScore = 0;
      const reasons = [];

      // 检查是否包含品牌关键词
      let hasBrand = false;
      for (const brand of brandKeywords) {
        if (line.includes(brand)) {
          hasBrand = true;
          compoundScore += 40;
          reasons.push(`品牌"${brand}"(+40)`);
          break;
        }
      }

      // 检查菜品关键词数量（必须≥2才考虑）
      let cuisineCount = 0;
      const foundCuisines = [];
      for (const suffix of cuisineSuffixes) {
        if (line.includes(suffix)) {
          cuisineCount++;
          foundCuisines.push(suffix);
          compoundScore += 30;  // 每个菜品+30分
        }
      }

      if (cuisineCount >= 2) {
        const bonus = (cuisineCount - 1) * 25;  // 额外奖励
        compoundScore += bonus;
        reasons.push(`多菜品(${foundCuisines.join('+')}) +${30 * cuisineCount + bonus}`);
      }

      // 检查分隔符数量（·、-、.等）
      const separators = line.match(/[·\-\.\s]/g);
      if (separators && separators.length >= 2) {
        compoundScore += 15 * Math.min(separators.length, 3);  // 最多+45分
        reasons.push(`${separators.length}个分隔符(+${15 * Math.min(separators.length, 3)})`);
      }

      // 必须同时满足：有品牌 + 有≥2个菜品 + 有≥2个分隔符
      if (hasBrand && cuisineCount >= 2 && separators && separators.length >= 2) {
        console.log(`  [第${i+1}行] 🎯 复合店名候选: "${line}" (${compoundScore.toFixed(0)}分)`);
        console.log(`         原因: ${reasons.join(', ')}`);

        if (compoundScore > globalBestScore) {
          globalBestScore = compoundScore;
          globalBestCandidate = line;
        }
      }
    }

    // 如果全局搜索找到更高分的复合店名，优先使用
    if (globalBestCandidate && globalBestScore > bestScore) {
      name = this.cleanShopName(globalBestCandidate);
      console.log(`\n✅ 策略0.5-全局复合店名: "${name}" (${globalBestScore.toFixed(0)}分, 覆盖前序结果)`);
    } else if (globalBestCandidate) {
      console.log(`\n⚠️ 全局找到复合店名但分数未超过前序: "${globalBestCandidate}" (${globalBestScore.toFixed(0)}分 < ${bestScore.toFixed(0)}分)`);
    }

    // ========== 策略1：查找包含括号的长标题（兜底方案）==========
    if (!name) {
      for (const line of cleanLines) {
        const titleMatch = line.match(/^(.{4,35})[\(（](.{2,20})[\)）]$/);
        if (titleMatch) {
          const candidateName = titleMatch[1].trim() + '(' + titleMatch[2].trim() + ')';
          
          if (!this.isNonShopInfo(candidateName) && candidateName.length >= 6) {
            name = candidateName;
            console.log('策略1-括号标题:', name);
            break;
          }
        }
      }
    }

    // 策略2：查找包含关键词的店名
    if (!name) {
      for (const line of cleanLines) {
        if (this.looksLikeShopName(line)) {
          name = line.replace(/^[·\-\s★☆⭐]+/, '').trim();
          console.log('策略2-关键词匹配:', name);
          break;
        }
      }
    }

    // 策略3：第一行通常就是店名
    if (!name && cleanLines.length > 0) {
      const firstLine = cleanLines[0].trim();
      if (firstLine.length >= 3 && firstLine.length <= 35 && !this.looksLikeRealAddress(firstLine)) {
        name = firstLine.replace(/[^\u4e00-\u9fa5a-zA-Z0-9()（）\-\s]/g, '');
        console.log('策略3-首行:', name);
      }
    }

    // 清理店名
    name = this.cleanShopName(name);

    // ========== 2. 提取地址 ==========
    console.log('\n[提取地址]');
    
    // 收集所有可能的地址候选
    const addressCandidates = [];
    
    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i].trim();
      
      // 跳过太短或太长的行
      if (line.length < 8 || line.length > 60) continue;
      
      // 跳过已识别为店名的行（避免重复）
      if (name && line.includes(name.substring(0, 5))) continue;
      
      // 跳过包含价格的行
      if (/￥|¥|元|折|券|人均/.test(line)) continue;
      
      // 跳过包含评分的行
      if (/\d+\.\d+分|★★★/.test(line)) continue;
      
      // ⭐ 新增：跳过榜单、排名、标签等非地址信息
      if (/榜单|排名|第\d+名|TOP\d+|top\d+|>\s*$|热门|推荐|好评|必吃/.test(line)) {
        console.log('跳过非地址信息:', line);
        continue;
      }
      
      // ⭐ 新增：跳过纯标签/分类信息
      if (/^(成都|美食|餐厅|火锅|烧烤|川菜|粤菜)$/.test(line)) {
        console.log('跳过标签:', line);
        continue;
      }
      
      // 判断是否像真实地址
      if (this.looksLikeRealAddress(line)) {
        // 计算地址匹配得分（门牌号权重最高）
        let score = 0;
        
        // 包含门牌号（最高优先级）
        if (/\d+号/.test(line)) score += 100;
        
        // 包含具体路名+号
        if (/建设南路|人民南路|天府大道|春熙路|太古里|跳蹬河/.test(line)) score += 80;
        
        // 包含区县名
        if (/(成华|锦江|青羊|武侯|高新|金牛)/.test(line)) score += 50;
        
        // 包含街道类型
        if (/街道|路|街|道|巷/.test(line)) score += 30;
        
        // 包含附号（如"附1号"）
        if (/附\d+号/.test(line)) score += 70;
        
        addressCandidates.push({
          text: line,
          score: score,
          index: i
        });
        
        console.log(`地址候选 [${score}分]:`, line);
      }
    }
    
    // 按得分排序，选择最佳地址
    if (addressCandidates.length > 0) {
      addressCandidates.sort((a, b) => b.score - a.score);
      address = addressCandidates[0].text;
      console.log('✅ 最终选择地址（最高分）:', address, `得分: ${addressCandidates[0].score}`);
      
      // 打印所有候选供调试
      if (addressCandidates.length > 1) {
        console.log('其他候选:');
        addressCandidates.slice(1, 5).forEach(c => {
          console.log(`  [${c.score}分]:`, c.text);
        });
      }
    } else {
      // 兜底方案：查找任何包含"号"的行
      console.log('未找到标准地址，尝试兜底方案...');
      for (const line of cleanLines) {
        if (/\d+号/.test(line) && line.length >= 10 && line.length <= 50 && 
            !line.includes('电话') && !line.includes('手机') &&
            !/榜单|排名|第\d+名/.test(line)) {
          address = line;
          console.log('兜底地址（包含门牌号）:', address);
          break;
        }
      }
    }

    // ========== 3. 提取价格 ==========
    console.log('\n[提取价格]');
    
    // 遍历所有行寻找价格
    for (const line of lines) {
      // 匹配 "人均XX" 或 "¥XX" 或 "XX元" 或 ">XX"
      const pricePatterns = [
        /人均[消费:：]?\s*[￥¥]?\s*(\d+)/,
        /[￥¥]\s*(\d+)/,
        /(\d+)\s*元/,
        />\s*(\d+)/,        // 如 ">97"
        /\d+\.\d+\s*折.*?(\d+)/,  // 折后价
        /套餐\s*[￥¥]?\s*(\d+)/
      ];

      for (const pattern of pricePatterns) {
        const match = line.match(pattern);
        if (match && !price) {
          const extractedPrice = parseInt(match[1]);
          // 价格应该在合理范围内（10-10000）
          if (extractedPrice >= 10 && extractedPrice <= 10000) {
            price = String(extractedPrice);
            console.log('找到价格:', price, '来源:', line.substring(0, 30));
            break;
          }
        }
      }
      
      if (price) break;
    }

    // ========== 4. 提取菜系 ==========
    console.log('\n[提取菜系]');
    
    for (const [cuisineId, keywords] of Object.entries(this._cuisineKeywords)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          cuisine = cuisineId;
          cuisineName = this.data.cuisineOptions.find(opt => opt.id === cuisineId)?.name || keyword;
          console.log('匹配菜系:', cuisineId, '->', cuisineName, '(关键词:', keyword, ')');
          break;
        }
      }
      if (cuisine) break;
    }

    // 特殊处理：如果店名包含特定词，自动判断菜系
    if (!cuisine && name) {
      if (/火锅|打边炉|涮肉|麻辣烫/i.test(name)) {
        cuisine = 'hotpot';
        cuisineName = '火锅';
      } else if (/烧烤|烤肉|串/i.test(name)) {
        cuisine = 'bbq';
        cuisineName = '烧烤';
      } else if (/咖啡|星巴克|瑞幸/i.test(name)) {
        cuisine = 'cafe';
        cuisineName = '咖啡';
      } else if (/奶茶|喜茶|奈雪|一点点/i.test(name)) {
        cuisine = 'tea';
        cuisineName = '奶茶';
      } else if (/日料|寿司|刺身|拉面/i.test(name)) {
        cuisine = 'japanese';
        cuisineName = '日韩餐';
      } else if (/西餐|牛排|披萨|汉堡/i.test(name)) {
        cuisine = 'western';
        cuisineName = '西餐';
      }
    }

    const result = {
      name: name.substring(0, 30),
      address: address.substring(0, 50),
      cuisine: cuisine,
      cuisineName: cuisineName,
      price: price
    };

    console.log('\n=== 最终提取结果 ===');
    console.log('店名:', result.name || '(未识别)');
    console.log('地址:', result.address || '(未识别)');
    console.log('菜系:', result.cuisineName || '(未识别)');
    console.log('价格:', result.price ? ('¥' + result.price) : '(未识别)');

    return result;
  },

  // 清理店名（去除多余字符）
  cleanShopName(name) {
    if (!name) return '';
    
    return name
      .replace(/^[\s·\-★☆⭐]+/, '')           // 去除前导符号
      .replace(/[\s·\-★☆⭐]+$/, '')           // 去除尾部符号
      .replace(/\s+/g, '')                    // 去除内部空格
      .substring(0, 30);                      // 截断过长名称
  },

  // 判断是否是非店名信息（如"评价(4464)"、"评分(xxx)"等）
  isNonShopInfo(text) {
    if (!text) return true;
    
    // 非店名关键词黑名单
    const nonShopPatterns = [
      /^评价/,           // "评价(4464)"
      /^评分/,           // "评分4.5"
      /^评论/,           // "评论数"
      /^点赞/,           // "点赞数"
      /^收藏/,           // "收藏数"
      /\d+条/,           // "4464条"
      /第\d+名/,         // "第1名"
      /TOP\d+/i,         // "TOP10"
      /榜单/,            // "销量榜"
      /打卡/,            // "934人打卡"
      /^\d+$/,           // 纯数字
      /^\d+\.\d+$/,     // 纯小数
      /^\d{1,2}:\d{2}$/, // 时间格式
      />$/,              // 以">"结尾（通常是地址截断）
      /^[A-Z]+\.[A-Z]+$/i, // 英文缩写如"HFAT.C"
      /^(视频|相册|图片|电话|手机|营业|地址|导航)/, // 功能性文字
    ];
    
    for (const pattern of nonShopPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    
    return false;
  },

  // 判断是否像店铺名称
  looksLikeShopName(text) {
    if (!text || text.length < 2 || text.length > 20) return false;

    const shopSuffixes = [
      '餐厅', '饭店', '酒楼', '食府', '厨房', '食堂', '小吃', '快餐',
      '火锅', '烤肉', '烧烤', '料理', '日料', '西餐', '咖啡', '酒吧',
      '茶馆', '奶茶', '甜品', '蛋糕', '面包', '烘焙', '海鲜', '大排档',
      '面馆', '粉馆', '粥店', '饺子馆', '包子铺', '麻辣烫', '串串',
      '肯德基', '麦当劳', '必胜客', '星巴克', '喜茶', '奈雪', '海底捞'
    ];

    for (const suffix of shopSuffixes) {
      if (text.endsWith(suffix) || text.includes(suffix)) {
        return true;
      }
    }

    if (/^[\u4e00-\u9fa5]{2,8}$/.test(text) && !this.looksLikeAddress(text)) {
      return true;
    }

    return false;
  },

  // 判断是否像地址（宽松版，用于初步筛选）
  looksLikeAddress(text) {
    const addressPatterns = [
      /路|街|道|巷|弄|胡同|广场|大厦|商场|购物中心/,
      /省|市|区|县|镇|乡|村|号|栋|层|室/,
      /\d{5,6}/,
      /(东|西|南|北)(侧|边|口)/,
      /地铁/
    ];

    for (const pattern of addressPatterns) {
      if (pattern.test(text)) return true;
    }

    return text.length > 10 && /[\u4e00-\u9fa5]/.test(text);
  },

  // 判断是否像真实地址（严格版，避免误判店名）
  looksLikeRealAddress(text) {
    if (!text || text.length < 8) return false;
    
    // 必须包含至少一个强地址特征
    const strongAddressFeatures = [
      /\d+号/,                    // 门牌号：8号附1号
      /\d+栋/,                    // 楼栋：3栋
      /\d+层/,                    // 楼层：5层
      /\d+室/,                    // 房间：201室
      /省|市|自治区/,             // 省市
      /(成华|锦江|青羊|武侯|高新|金牛|龙泉驿|新都|温江|双流|郫都)/,  // 成都区县
      /路\d+号|街\d+号|道\d+号/,  // 路名+门牌号
      /建设南路|人民南路|天府大道|春熙路|太古里/  // 成都著名道路
    ];
    
    for (const pattern of strongAddressFeatures) {
      if (pattern.test(text)) return true;
    }
    
    // 包含多个一般地址特征（至少2个）
    const generalFeatures = [
      /路|街|道|巷|弄|胡同/,
      /广场|大厦|商场|购物中心|写字楼/,
      /区|县|镇|乡|村/,
      /附\d+号/,                  // 附1号、附2号
      /(东|西|南|北)(侧|边|口)/,
    ];
    
    let matchCount = 0;
    for (const pattern of generalFeatures) {
      if (pattern.test(text)) matchCount++;
    }
    
    // 至少匹配2个特征才认为是地址
    return matchCount >= 2;
  },

  // 自动填充表单
  autoFillForm(info) {
    const updateData = {};

    if (info.name) {
      updateData.name = info.name;
    }

    if (info.address) {
      updateData.location = info.address;
    }

    if (info.cuisine && info.cuisineName) {
      updateData.cuisine = info.cuisine;
      updateData.cuisineName = info.cuisineName;
      updateData.customCuisineName = '';
    }

    if (info.price) {
      updateData.avgPrice = info.price;
    }

    this.setData(updateData);
    this.checkFormValid();
  },

  // 清除AI识别结果
  clearAIResult() {
    this.setData({
      aiResult: null
    });
    this.onAIRecognize();
  }
});
