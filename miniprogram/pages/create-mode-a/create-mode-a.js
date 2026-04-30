const Validator = require('../../utils/validator');
const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
    posters: [],
    showPlatformPopup: false,
    selectedPlatform: '',
    editingPosterIndex: -1,
    title: '',
    location: '',
    peopleCount: '',
    deadlineText: '',
    activityDate: '',
    activityDateRaw: '',
    activityTime: '',
    activityTimeRaw: '',
    deadlineDate: '',
    deadlineDateRaw: '',
    deadlineTime: '',
    deadlineTimeRaw: '',
    timeAuxiliary: true,
    groupOrderOption: false,
    canCreate: false,
    isSubmitting: false, // 防重复提交标记
    // 房间密码
    needPassword: false,
    roomPassword: '',
    // 付费方式和匿名投票
    paymentMode: 'AA',
    isAnonymous: false,
    // 时间和地点
    locationText: '',
    dinnerDate: '',
    dinnerTime: '',
  },

  onLoad(options) {
    // 检查是否是编辑模式
    if (options.edit && options.roomId) {
      this.setData({ isEditMode: true, editRoomId: options.roomId });
      this.loadRoomData(options.roomId);
    }
  },

  // 加载房间数据（编辑模式）
  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });
      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId }
      });
      
      if (result.code !== 0) throw new Error(result.msg);
      
      const room = result.data;
      
      // 填充表单数据
      this.setData({
        title: room.title || '',
        location: room.location || '',
        locationText: room.location || '',
        peopleCount: room.peopleCount ? String(room.peopleCount) : '',
        posters: room.candidatePosters || [],
        activityDate: room.activityDate || '',
        activityDateRaw: room.activityDate ? room.activityDate.replace(/\D/g, '') : '',
        activityTime: room.activityTime || '',
        activityTimeRaw: room.activityTime ? room.activityTime.replace(/\D/g, '') : '',
        deadlineDate: room.voteDeadline ? room.voteDeadline.split('T')[0] : '',
        deadlineDateRaw: room.voteDeadline ? room.voteDeadline.split('T')[0].replace(/\D/g, '') : '',
        deadlineTime: room.voteDeadline ? room.voteDeadline.split('T')[1].slice(0, 5) : '',
        deadlineTimeRaw: room.voteDeadline ? room.voteDeadline.split('T')[1].slice(0, 5).replace(/\D/g, '') : '',
        timeAuxiliary: room.timeAuxiliary !== false
      }, () => {
        this.checkFormValid();
      });
      
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  checkFormValid() {
    const { posters, title, activityDateRaw, activityTimeRaw, dinnerDateRaw, dinnerTimeRaw } = this.data;
    const hasDate = (activityDateRaw && activityDateRaw.length >= 2) || (dinnerDateRaw && dinnerDateRaw.length >= 2);
    const hasTime = (activityTimeRaw && activityTimeRaw.length === 4) || (dinnerTimeRaw && dinnerTimeRaw.length === 4);
    const canCreate = posters.length >= 1 && title.trim() !== '' && hasDate && hasTime;
    this.setData({ canCreate, canSubmit: canCreate });
  },

  addPoster() {
    wx.chooseMedia({
      count: 6 - this.data.posters.length,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPosters = res.tempFiles.map(file => ({
          tempFilePath: file.tempFilePath,
          platformSource: ''
        }));
        this.setData({
          posters: [...this.data.posters, ...newPosters]
        }, () => {
          this.checkFormValid();
        });
      },
      fail: (err) => {
        if (err.errMsg && (err.errMsg.includes('fail auth') || err.errMsg.includes('cancel'))) {
          wx.showModal({
            title: '需要授权',
            content: '开启相册权限后，可上传店铺海报供好友投票',
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

  markPlatform(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({
      showPlatformPopup: true,
      editingPosterIndex: index,
      selectedPlatform: this.data.posters[index].platformSource || ''
    });
  },

  selectPlatform(e) {
    this.setData({ selectedPlatform: e.currentTarget.dataset.platform });
  },

  confirmPlatform() {
    const { editingPosterIndex, selectedPlatform } = this.data;
    if (editingPosterIndex >= 0 && selectedPlatform) {
      this.setData({
        [`posters[${editingPosterIndex}].platformSource`]: selectedPlatform,
        showPlatformPopup: false,
        editingPosterIndex: -1
      });
    }
  },

  closePopup() {
    this.setData({ showPlatformPopup: false });
  },

  removePoster(e) {
    const { index } = e.currentTarget.dataset;
    const posters = [...this.data.posters];
    posters.splice(index, 1);
    this.setData({ posters }, () => {
      this.checkFormValid();
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value }, () => {
      this.checkFormValid();
    });
  },

  // 手动输入地点
  onLocationInput(e) {
    this.setData({ locationText: e.detail.value });
  },

  // 选择地图位置
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        // 组合地点名称和地址，提供更准确的描述
        let locationName = res.name || '';
        let address = res.address || '';

        // 如果名称和地址都有，组合显示
        let fullLocation = locationName;
        if (address && !locationName.includes(address)) {
          fullLocation = locationName ? `${locationName}（${address}）` : address;
        }

        // 如果都为空，显示未知位置
        if (!fullLocation) {
          fullLocation = '未知位置';
        }

        this.setData({ locationText: fullLocation });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消，不做处理
          return;
        }
        // 如果没有权限，提示用户
        wx.showModal({
          title: '需要授权',
          content: '开启位置权限后，可从地图选择聚餐地点，也可手动输入',
          confirmText: '去开启',
          cancelText: '手动输入',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  onPeopleInput(e) { this.setData({ peopleCount: e.detail.value }); },

  // 格式化日期，支持3位数字自动补零（如423 -> 0423）
  // 手动输入活动日期
  onDateInput(e) {
    let value = e.detail.value;

    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本，直接保存
    if (/[月日]/.test(value)) {
      // 提取其中的数字
      let numbers = value.replace(/\D/g, '');
      this.setData({ activityDate: value, activityDateRaw: numbers });
      return;
    }

    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    // 限制4位
    if (numbers.length > 4) numbers = numbers.substring(0, 4);

    // 实时处理：2位数字时自动补零显示（53 -> 5月3日，但保存raw为2位）
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ activityDate: displayValue, activityDateRaw: numbers });
  },

  // 活动日期输入完成 - 2位和3位数字自动补零
  onDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 2位数字时，补零为4位（53 -> 0503）
    if (rawValue.length === 2) {
      const month = rawValue.substring(0, 1);
      const day = rawValue.substring(1);
      rawValue = '0' + month + '0' + day;
    }
    // 3位数字时，首位补零
    else if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 重新格式化显示（只要有输入就更新，包括2位）
    if (rawValue.length >= 2) {
      let displayValue = this.formatDateDisplay(rawValue);
      this.setData({ activityDate: displayValue, activityDateRaw: rawValue });
    }
  },

  // 格式化日期显示（0424 -> 04月24日）
  formatDateDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length === 1) {
      return numbers;
    }
    // 2位数字：第一位是月，第二位是日（53 -> 5月3日）
    if (numbers.length === 2) {
      const m = numbers.substring(0, 1);
      const d = numbers.substring(1);
      return m + '月' + d + '日';
    }
    // 3位数字：第一位是月，后两位是日（424 -> 4月24日）
    if (numbers.length === 3) {
      const m = numbers.substring(0, 1);
      const d = numbers.substring(1);
      return m + '月' + d + '日';
    }
    // 4位数字：前两位是月，后两位是日（0424 -> 04月24日）
    const month = numbers.substring(0, 2);
    const day = numbers.substring(2);
    return month + '月' + day + '日';
  },

  // 手动输入活动时间
  onTimeInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（时、分），说明用户正在编辑格式化后的文本，直接保存
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ activityTime: value, activityTimeRaw: numbers });
      return;
    }
    
    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    // 限制4位
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    // 格式化为时分显示
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ activityTime: displayValue, activityTimeRaw: numbers });
  },

  // 活动时间输入完成 - 2位数字自动补全为整点
  onTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 如果输入2位数字，自动补全为整点（如18 -> 1800）
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    }
    // 如果输入3位数字，自动补零（如183 -> 1830）
    else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    }

    // 重新格式化显示
    if (rawValue.length >= 2) {
      let displayValue = this.formatTimeDisplay(rawValue);
      this.setData({ activityTime: displayValue, activityTimeRaw: rawValue });
    }
  },

  // 格式化时间显示（1800 -> 18时00分）
  formatTimeDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
    }
    // 3位数字：前两位是时，第三位是分（183 -> 18时3分）
    if (numbers.length === 3) {
      const h = numbers.substring(0, 2);
      const m = numbers.substring(2);
      return h + '时' + m + '分';
    }
    // 4位数字：前两位是时，后两位是分（1800 -> 18时00分）
    const hour = numbers.substring(0, 2);
    const minute = numbers.substring(2);
    return hour + '时' + minute + '分';
  },

  // 手动输入投票截止日期
  onDeadlineDateInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本，直接保存
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineDate: value, deadlineDateRaw: numbers });
      this.updateDeadlineText();
      return;
    }
    
    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    // 限制4位
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    // 格式化为月日显示
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: numbers });
    this.updateDeadlineText();
  },

  // 截止日期输入完成 - 2位和3位数字自动补零
  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 2位数字时，补零为4位（53 -> 0503）
    if (rawValue.length === 2) {
      const month = rawValue.substring(0, 1);
      const day = rawValue.substring(1);
      rawValue = '0' + month + '0' + day;
    }
    // 3位数字时，首位补零
    else if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 重新格式化显示（只要有输入就更新，包括2位）
    if (rawValue.length >= 2) {
      let displayValue = this.formatDateDisplay(rawValue);
      this.setData({ deadlineDate: displayValue, deadlineDateRaw: rawValue });
      this.updateDeadlineText();
    }
  },

  // 手动输入投票截止时间
  onDeadlineTimeInput(e) {
    let value = e.detail.value;

    // 如果值包含中文（时、分），说明用户正在编辑格式化后的文本，直接保存
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers });
      this.updateDeadlineText();
      return;
    }

    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    // 限制4位
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    // 格式化为时分显示
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: numbers });
    this.updateDeadlineText();
  },

  // 截止时间输入完成 - 2位数字自动补全为整点
  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 如果输入2位数字，自动补全为整点（如18 -> 1800）
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    }
    // 如果输入3位数字，自动补零（如183 -> 1830）
    else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    }

    // 重新格式化显示
    if (rawValue.length >= 2) {
      let displayValue = this.formatTimeDisplay(rawValue);
      this.setData({ deadlineTime: displayValue, deadlineTimeRaw: rawValue });
      this.updateDeadlineText();
    }
  },

  updateDeadlineText() {
    const { deadlineDateRaw, deadlineTimeRaw } = this.data;
    if (deadlineDateRaw && deadlineTimeRaw && deadlineDateRaw.length === 4 && deadlineTimeRaw.length === 4) {
      const month = deadlineDateRaw.substring(0, 2);
      const day = deadlineDateRaw.substring(2, 4);
      const hour = deadlineTimeRaw.substring(0, 2);
      const minute = deadlineTimeRaw.substring(2, 4);
      const text = `${month}-${day} ${hour}:${minute}`;
      this.setData({ deadlineText: text });
    }
  },

  onTimeAuxiliaryChange(e) { this.setData({ timeAuxiliary: e.detail.value }); },

  // 付费方式切换
  onPaymentModeChange(e) {
    this.setData({ paymentMode: e.currentTarget.dataset.mode });
  },

  // 匿名投票切换
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  // 密码开关切换
  onPasswordSwitchChange(e) {
    this.setData({ 
      needPassword: e.detail.value,
      roomPassword: ''
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ roomPassword: e.detail.value });
  },

  // 地点输入
  onLocationInput(e) {
    this.setData({ locationText: e.detail.value });
  },

  // 选择地点
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          locationText: res.name || res.address
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          return;
        }
        wx.showModal({
          title: '需要授权',
          content: '开启位置权限后，可从地图选择聚餐地点，也可手动输入',
          confirmText: '去开启',
          cancelText: '手动输入',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 聚餐日期输入
  onDinnerDateInput(e) {
    let value = e.detail.value;
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ dinnerDate: value, dinnerDateRaw: numbers }, () => this.checkFormValid());
      return;
    }
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ dinnerDate: displayValue, dinnerDateRaw: numbers }, () => this.checkFormValid());
  },

  onDinnerDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    if (rawValue.length === 2) {
      const month = rawValue.substring(0, 1);
      const day = rawValue.substring(1);
      rawValue = '0' + month + '0' + day;
    } else if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }
    if (rawValue.length >= 2) {
      let displayValue = this.formatDateDisplay(rawValue);
      this.setData({ dinnerDate: displayValue, dinnerDateRaw: rawValue }, () => this.checkFormValid());
    }
  },

  // 聚餐时间输入
  onDinnerTimeInput(e) {
    let value = e.detail.value;
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ dinnerTime: value, dinnerTimeRaw: numbers }, () => this.checkFormValid());
      return;
    }
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ dinnerTime: displayValue, dinnerTimeRaw: numbers }, () => this.checkFormValid());
  },

  onDinnerTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    } else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    }
    if (rawValue.length >= 2) {
      let displayValue = this.formatTimeDisplay(rawValue);
      this.setData({ dinnerTime: displayValue, dinnerTimeRaw: rawValue }, () => this.checkFormValid());
    }
  },

  // 投票截止日期输入
  onDeadlineDateInput(e) {
    let value = e.detail.value;
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineDate: value, deadlineDateRaw: numbers }, () => this.checkFormValid());
      return;
    }
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: numbers }, () => this.checkFormValid());
  },

  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    if (rawValue.length === 2) {
      const month = rawValue.substring(0, 1);
      const day = rawValue.substring(1);
      rawValue = '0' + month + '0' + day;
    } else if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }
    if (rawValue.length >= 2) {
      let displayValue = this.formatDateDisplay(rawValue);
      this.setData({ deadlineDate: displayValue, deadlineDateRaw: rawValue }, () => this.checkFormValid());
    }
  },

  // 投票截止时间输入
  onDeadlineTimeInput(e) {
    let value = e.detail.value;
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers }, () => this.checkFormValid());
      return;
    }
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: numbers }, () => this.checkFormValid());
  },

  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    } else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    }
    if (rawValue.length >= 2) {
      let displayValue = this.formatTimeDisplay(rawValue);
      this.setData({ deadlineTime: displayValue, deadlineTimeRaw: rawValue }, () => this.checkFormValid());
    }
  },

  async createRoom() {
    // 防重复提交
    if (this.data.isSubmitting) {
      return;
    }

    const { title, location, locationText, peopleCount, activityDateRaw, activityTimeRaw, posters, deadlineDateRaw, deadlineTimeRaw, timeAuxiliary, dinnerDateRaw, dinnerTimeRaw } = this.data;

    // 兼容旧字段：如果activityDateRaw为空，尝试使用dinnerDateRaw
    const finalActivityDateRaw = activityDateRaw || dinnerDateRaw || '';
    const finalActivityTimeRaw = activityTimeRaw || dinnerTimeRaw || '';
    console.log('字段映射:', { activityDateRaw, dinnerDateRaw, finalActivityDateRaw, activityTimeRaw, dinnerTimeRaw, finalActivityTimeRaw });

    // 使用 locationText 作为地点（用户输入的值）
    const finalLocation = locationText || location;
    console.log('提交时地点值:', finalLocation, 'location:', location, 'locationText:', locationText);

    // 使用 Validator 进行详细校验
    console.log('校验前数据:', { finalActivityDateRaw, finalActivityTimeRaw, deadlineDateRaw, deadlineTimeRaw });
    const validations = [
      { valid: posters.length >= 1, msg: '请至少上传1张海报' },
      { valid: Validator.string(title, { required: true, minLength: 2, maxLength: 50 }).valid, msg: '标题长度需在2-50个字符之间' },
      { valid: Validator.string(finalLocation, { required: true, minLength: 2, maxLength: 100 }).valid, msg: '地点长度需在2-100个字符之间' },
      { valid: finalActivityDateRaw && finalActivityDateRaw.length >= 2 && finalActivityDateRaw.length <= 4, msg: '请输入2-4位活动日期（如：53、423或0423）' },
      { valid: finalActivityTimeRaw && finalActivityTimeRaw.length === 4, msg: '请输入4位活动时间（如：1830）' },
    ];

    for (const validation of validations) {
      if (!validation.valid) {
        console.log('校验失败:', validation.msg);
        wx.showToast({ title: validation.msg, icon: 'none' });
        return;
      }
    }

    // 设置提交中标记
    this.setData({ isSubmitting: true });

    // 格式化日期为4位（2位时补前导零，3位时补首位零）
    let formattedActivityDate = finalActivityDateRaw;
    if (finalActivityDateRaw.length === 2) {
      // 2位数字表示 月日（如53 -> 0503）
      const month = finalActivityDateRaw.substring(0, 1);
      const day = finalActivityDateRaw.substring(1);
      formattedActivityDate = '0' + month + '0' + day;
    } else if (finalActivityDateRaw.length === 3) {
      formattedActivityDate = '0' + finalActivityDateRaw;
    }
    console.log('活动日期格式化:', finalActivityDateRaw, '->', formattedActivityDate);

    let formattedDeadlineDate = deadlineDateRaw;
    if (deadlineDateRaw) {
      if (deadlineDateRaw.length === 2) {
        const month = deadlineDateRaw.substring(0, 1);
        const day = deadlineDateRaw.substring(1);
        formattedDeadlineDate = '0' + month + '0' + day;
      } else if (deadlineDateRaw.length === 3) {
        formattedDeadlineDate = '0' + deadlineDateRaw;
      }
      console.log('截止日期格式化:', deadlineDateRaw, '->', formattedDeadlineDate);
    }

    // 构建截止时间
    let voteDeadline = new Date(Date.now() + 24 * 3600 * 1000);
    if (formattedDeadlineDate && deadlineTimeRaw && formattedDeadlineDate.length === 4 && deadlineTimeRaw.length === 4) {
      const month = parseInt(formattedDeadlineDate.substring(0, 2)) - 1;
      const day = parseInt(formattedDeadlineDate.substring(2, 4));
      const hour = parseInt(deadlineTimeRaw.substring(0, 2));
      const minute = parseInt(deadlineTimeRaw.substring(2, 4));
      const currentYear = new Date().getFullYear();
      const parsed = new Date(currentYear, month, day, hour, minute);
      if (!isNaN(parsed.getTime())) {
        // 验证截止时间不能早于当前时间
        const now = new Date();
        if (parsed <= now) {
          wx.showToast({ title: '截止时间不能早于当前时间', icon: 'none' });
          return;
        }
        voteDeadline = parsed;
      }
    }

    // 构建活动日期（添加当前年份）
    const currentYear = new Date().getFullYear();
    const activityMonth = formattedActivityDate.substring(0, 2);
    const activityDay = formattedActivityDate.substring(2, 4);
    const fullActivityDate = `${currentYear}-${activityMonth}-${activityDay}`;

    // 构建活动时间（添加冒号）
    const activityHour = finalActivityTimeRaw.substring(0, 2);
    const activityMinute = finalActivityTimeRaw.substring(2, 4);
    const fullActivityTime = `${activityHour}:${activityMinute}`;

    wx.showLoading({ title: this.data.isEditMode ? '保存中' : '创建中' });

    // 非阻塞地请求订阅消息
    if (timeAuxiliary) {
      this.requestSubscribeMessage();
    }

    try {
      // 检查是否有新上传的图片
      const hasNewPosters = posters.some(p => p.tempFilePath);
      
      let uploadedPosters = posters;
      if (hasNewPosters) {
        // 只上传新添加的图片
        uploadedPosters = await Promise.all(
          posters.map(async (p, idx) => {
            if (!p.tempFilePath) return p;
            try {
              // 先压缩图片
              const compressedRes = await wx.compressImage({
                src: p.tempFilePath,
                quality: 80
              });
              
              const { fileID } = await wx.cloud.uploadFile({
                cloudPath: `posters/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
                filePath: compressedRes.tempFilePath
              });
              console.log(`海报${idx + 1}上传成功:`, fileID);
              return { imageUrl: fileID, platformSource: p.platformSource || '' };
            } catch (uploadErr) {
              console.error(`海报${idx + 1}上传失败:`, uploadErr);
              throw new Error(`第${idx + 1}张海报上传失败，请重试`);
            }
          })
        );
      }
      
      console.log('准备创建房间，海报数据:', uploadedPosters);

      let result;
      
      if (this.data.isEditMode) {
        // 编辑模式：调用更新接口
      wx.cloud.callFunction({
        name: 'updateRoom',
        data: {
          roomId: this.data.editRoomId,
          title,
          location: finalLocation,
          peopleCount: parseInt(peopleCount) || 0,
          activityDate: fullActivityDate,
          activityTime: fullActivityTime,
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary
          }
        });
      } else {
        // 获取用户信息
        const userInfo = wx.getStorageSync('userInfo') || {};
        
        // 创建模式
        result = await wx.cloud.callFunction({
          name: 'createRoom',
          data: {
            title,
            location: finalLocation,
            peopleCount: parseInt(peopleCount) || 0,
            activityDate: fullActivityDate,
            activityTime: fullActivityTime,
            mode: 'pick_for_them',
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary,
            creatorNickName: userInfo.nickName || '',
            creatorAvatarUrl: userInfo.avatarUrl || ''
          }
        });
      }

      if (result.result.code !== 0) throw new Error(result.result.msg);

      wx.hideLoading();
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
      wx.showToast({
        title: this.data.isEditMode ? '保存成功' : '创建成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateTo({ url: `/pages/control/control?roomId=${this.data.isEditMode ? this.data.editRoomId : result.result.data.roomId}` });
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || (this.data.isEditMode ? '保存失败' : '创建失败'), icon: 'none' });
    } finally {
      // 重置提交标记
      this.setData({ isSubmitting: false });
    }
  },

  async requestSubscribeMessage() {
    try {
      const tmplIds = [
        'YOUR_TMPL_ID_1',
        'YOUR_TMPL_ID_2',
        'YOUR_TMPL_ID_3'
      ];

      const res = await wx.requestSubscribeMessage({
        tmplIds: tmplIds
      });

      console.log('订阅消息授权结果:', res);

      if (res[tmplIds[0]] === 'accept' || res[tmplIds[1]] === 'accept' || res[tmplIds[2]] === 'accept') {
        await wx.cloud.callFunction({
          name: 'saveSubscription',
          data: {
            subscriptions: res
          }
        });
      }
    } catch (err) {
      console.error('订阅消息授权失败:', err);
    }
  },
});
