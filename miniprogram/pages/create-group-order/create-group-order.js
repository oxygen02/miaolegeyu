const { generateRoomId } = require('../../utils/uuid.js');
const { imagePaths } = require('../../config/imageConfig');
const { withLock } = require('../../utils/debounce');

// 创建默认选项
const createDefaultOption = () => ({
  title: '',
  selectedPlatform: '', // 默认不选中任何平台
  deadlineText: '',
  shopImage: '', // 单张图片
  shopLink: ''
});

Page({
  data: {
    imagePaths: imagePaths,
    // 多选项数据 - 默认两个选项
    shopOptions: [createDefaultOption(), createDefaultOption()],
    currentOptionIndex: 0,
    // 是否可以提交
    canSubmitFlag: false,

    // 时间选择器
    timeRange: [['今天','明天','后天'], ['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00']],
    timeIndex: [0, 2],
    tempTimeIndex: [0, 2],
    showTimePickerPopup: false,
    editingOptionIndex: 0
  },

  onLoad() {
    // 防抖：创建拼单
    this._lockedCreateGroupOrder = withLock(this.createGroupOrder.bind(this));
    // 初始化两个选项的默认时间
    this.updateDeadlineText(0);
    this.updateDeadlineText(1);
    // 初始化提交状态
    this.checkSubmitStatus();
  },

  // 切换选项
  switchOption(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentOptionIndex: index });
  },

  // 添加选项
  addOption() {
    const { shopOptions } = this.data;
    if (shopOptions.length >= 3) {
      wx.showToast({ title: '最多添加3个选项', icon: 'none' });
      return;
    }
    const newOptions = [...shopOptions, createDefaultOption()];
    this.setData({
      shopOptions: newOptions,
      currentOptionIndex: newOptions.length - 1
    }, () => {
      this.checkSubmitStatus();
    });
  },

  // 删除选项
  deleteOption(e) {
    const index = e.currentTarget.dataset.index;
    const { shopOptions, currentOptionIndex } = this.data;
    
    if (shopOptions.length <= 1) {
      wx.showToast({ title: '至少保留一个选项', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定删除选项${index + 1}吗？`,
      success: (res) => {
        if (res.confirm) {
          const newOptions = shopOptions.filter((_, i) => i !== index);
          let newIndex = currentOptionIndex;
          if (currentOptionIndex >= newOptions.length) {
            newIndex = newOptions.length - 1;
          }
          this.setData({
            shopOptions: newOptions,
            currentOptionIndex: newIndex
          }, () => {
            this.checkSubmitStatus();
          });
        }
      }
    });
  },

  // 输入处理
  onTitleInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    this.updateOptionField(index, 'title', value);
  },

  onAmountInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    this.updateOptionField(index, 'minAmount', value);
  },

  onShopLinkInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    this.updateOptionField(index, 'shopLink', value);
    
    // 自动识别平台
    const platform = this.detectPlatform(value);
    if (platform) {
      this.updateOptionField(index, 'selectedPlatform', platform);
    }
  },

  // 更新选项字段
  updateOptionField(index, field, value) {
    const { shopOptions } = this.data;
    const newOptions = [...shopOptions];
    newOptions[index] = { ...newOptions[index], [field]: value };
    this.setData({ shopOptions: newOptions }, () => {
      // 数据更新后检查提交状态
      this.checkSubmitStatus();
    });
  },

  // 检查提交状态
  checkSubmitStatus() {
    const canSubmitResult = this.canSubmit();
    this.setData({ canSubmitFlag: canSubmitResult });
  },

  // 显示时间选择器
  showTimePicker(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      showTimePickerPopup: true,
      tempTimeIndex: this.data.timeIndex,
      editingOptionIndex: index
    });
  },

  closeTimePicker() {
    this.setData({ showTimePickerPopup: false });
  },

  confirmTimePicker() {
    const { editingOptionIndex, tempTimeIndex, timeRange } = this.data;
    
    // 验证时间不能早于当前时间
    const selectedDay = timeRange[0][tempTimeIndex[0]];
    const selectedTime = timeRange[1][tempTimeIndex[1]];
    
    if (!this.isValidDeadline(selectedDay, selectedTime)) {
      wx.showToast({ 
        title: '截止时间不能早于当前时间', 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    this.setData({
      timeIndex: tempTimeIndex,
      showTimePickerPopup: false
    }, () => {
      this.updateDeadlineText(editingOptionIndex);
      // 时间更新后检查提交状态
      this.checkSubmitStatus();
    });
  },

  // 验证截止时间是否有效（不能早于当前时间）
  isValidDeadline(day, time) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // 解析选择的时间
    const [hourStr, minuteStr] = time.split(':');
    const selectedHour = parseInt(hourStr);
    const selectedMinute = parseInt(minuteStr);
    
    // 解析选择的日期
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    
    let selectedDate;
    if (day === '今天') {
      selectedDate = today;
    } else if (day === '明天') {
      selectedDate = tomorrow;
    } else if (day === '后天') {
      selectedDate = dayAfterTomorrow;
    } else {
      return false;
    }
    
    // 如果选择今天，需要比较时间
    if (day === '今天') {
      if (selectedHour < currentHour) {
        return false;
      }
      if (selectedHour === currentHour && selectedMinute <= currentMinute) {
        return false;
      }
    }
    
    return true;
  },

  onPickerViewChange(e) {
    this.setData({ tempTimeIndex: e.detail.value });
  },

  // 选择平台（点击已选中的平台则取消选中）
  selectPlatform(e) {
    const index = e.currentTarget.dataset.index;
    const platform = e.currentTarget.dataset.platform;
    const { shopOptions } = this.data;
    const currentPlatform = shopOptions[index].selectedPlatform;
    
    // 如果点击的是已选中的平台，则取消选中
    if (currentPlatform === platform) {
      this.updateOptionField(index, 'selectedPlatform', '');
    } else {
      this.updateOptionField(index, 'selectedPlatform', platform);
    }
  },

  // 更新时间文本
  updateDeadlineText(optionIndex) {
    const [d, t] = this.data.timeIndex;
    const day = this.data.timeRange[0][d];
    const time = this.data.timeRange[1][t];
    const deadlineText = `${day} ${time}`;
    this.updateOptionField(optionIndex, 'deadlineText', deadlineText);
  },

  // 选择店铺图片
  chooseShopImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.updateOptionField(index, 'shopImage', tempFilePath);
      },
      fail: (err) => {
        if (err.errMsg && (err.errMsg.includes('fail auth') || err.errMsg.includes('cancel'))) {
          wx.showModal({
            title: '需要授权',
            content: '开启相册/相机权限后，可上传商品图片展示给好友',
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

  // 预览店铺图片
  previewShopImage(e) {
    const index = e.currentTarget.dataset.index;
    const { shopOptions } = this.data;
    wx.previewImage({
      urls: [shopOptions[index].shopImage]
    });
  },

  // 删除店铺图片
  deleteShopImage(e) {
    const index = e.currentTarget.dataset.index;
    this.updateOptionField(index, 'shopImage', '');
  },

  // 粘贴店铺链接
  async pasteShopLink(e) {
    const index = e.currentTarget.dataset.index;
    try {
      const res = await wx.getClipboardData();
      const link = res.data;
      this.updateOptionField(index, 'shopLink', link);
      
      // 自动识别平台
      const platform = this.detectPlatform(link);
      if (platform) {
        this.updateOptionField(index, 'selectedPlatform', platform);
      }
      
      wx.showToast({ title: '已粘贴', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '粘贴失败', icon: 'none' });
    }
  },

  // 根据链接自动识别平台
  detectPlatform(link) {
    if (!link) return null;
    const lowerLink = link.toLowerCase();
    if (lowerLink.includes('meituan') || lowerLink.includes('dianping')) {
      return 'meituan';
    } else if (lowerLink.includes('taobao') || lowerLink.includes('ele.me')) {
      return 'taobao';
    } else if (lowerLink.includes('jd') || lowerLink.includes('jddj')) {
      return 'jd';
    }
    return null;
  },

  // 检查是否可以提交 - 至少有一个选项填写了标题
  canSubmit() {
    const { shopOptions } = this.data;
    // 至少有一个选项填写了标题即可发起
    return shopOptions.some(option => 
      option.title && option.title.trim() !== ''
    );
  },

  // 检查单个选项是否完整（用于提示用户）
  isOptionComplete(option) {
    return option.title && option.title.trim() !== '' &&
      option.shopImage && option.shopImage.trim() !== '' &&
      option.deadlineText && option.deadlineText.trim() !== '' &&
      option.selectedPlatform && option.selectedPlatform.trim() !== '';
  },

  // 创建拼单
  async createGroupOrder() {
    console.log('点击发起拼单按钮');
    console.log('canSubmitFlag:', this.data.canSubmitFlag);
    console.log('shopOptions:', this.data.shopOptions);
    
    if (!this.canSubmit()) {
      console.log('canSubmit返回false，无法提交');
      wx.showToast({ title: '请至少完成一个选项（标题、图片、时间、平台）', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...', mask: true });

    try {
      const roomId = generateRoomId();
      const { shopOptions } = this.data;

      // 保存所有填写了标题的选项（不再强制要求所有字段都填）
      const validOptions = shopOptions.filter(option => 
        option.title && option.title.trim() !== ''
      );
      
      console.log('有效选项数量:', validOptions.length);
      console.log('有效选项:', validOptions);

      // 检查是否有不完整的选项，给出提示
      const incompleteOptions = validOptions.filter(opt => !this.isOptionComplete(opt));
      if (incompleteOptions.length > 0) {
        const names = incompleteOptions.map((opt, i) => {
          const idx = shopOptions.indexOf(opt);
          return `选项${idx + 1}「${opt.title}」`;
        }).join('、');
        wx.showToast({ title: `${names} 信息不完整，部分内容将缺失`, icon: 'none', duration: 2500 });
      }

      // 处理选项的图片上传
      const optionsWithImages = await Promise.all(
        validOptions.map(async (option, idx) => {
          const data = {
            title: option.title,
            platform: option.selectedPlatform,
            shopLink: option.shopLink,
            deadlineText: option.deadlineText
          };

          // 如果有店铺图片（临时文件路径），上传到云存储
          if (option.shopImage && (option.shopImage.startsWith('wxfile://') || option.shopImage.startsWith('http'))) {
            try {
              const uploadRes = await wx.cloud.uploadFile({
                cloudPath: `shop-images/${roomId}-${idx}-${Date.now()}.jpg`,
                filePath: option.shopImage
              });
              data.shopImage = uploadRes.fileID;
            } catch (uploadErr) {
              console.error('图片上传失败:', uploadErr);
            }
          }

          return data;
        })
      );

      console.log('====== 准备传入云函数的 optionsWithImages ======');
      console.log('optionsWithImages 数量:', optionsWithImages.length);
      console.log('optionsWithImages 详情:', JSON.stringify(optionsWithImages));
      console.log('================================================');

      // 创建拼单房间
      await wx.cloud.callFunction({
        name: 'createRoom',
        data: {
          roomId,
          mode: 'group',
          options: optionsWithImages,
          optionCount: optionsWithImages.length
        }
      });

      wx.hideLoading();
      
      wx.showToast({
        title: '发起拼单成功',
        icon: 'success',
        duration: 2000
      });

      // 跳转到拼单详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/group-detail/group-detail?roomId=${roomId}`
        });
      }, 1500);

    } catch (err) {
      console.error('创建拼单失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '创建失败: ' + (err.message || '未知错误'), icon: 'none' });
    }
  }
});
