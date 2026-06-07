const Validator = getApp().globalData.Validator;
const { imagePaths } = getApp().globalData;
const { withLock } = getApp().globalData.debounce;
const { checkContentWithToast } = require('../../../utils/contentSecurity');

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
    paymentMode: '',
    isAnonymous: false,
    // 时间和地点
    locationText: '',
    dinnerDate: '',
    dinnerTime: '',
    // 隐私设置
    visibility: 'friends', // friends: 仅好友可见, share: 仅通过分享可见
    showDataRetentionTip: false, // 是否显示数据保留提示
    agreeDefault: false, // 是否勾选"下次不再显示"
  },

  onLoad(options) {
    // 防抖：创建房间
    this._lockedCreateRoom = withLock(this.createRoom.bind(this));
    // 检查是否是编辑模式
    if (options.edit && options.roomId) {
      this.setData({ isEditMode: true, editRoomId: options.roomId });
      this.loadRoomData(options.roomId);
    }
    // 检查是否来自时间投票确认
    if (options.fromScheduleVote === 'true' && options.scheduleDate) {
      this.fillFromScheduleVote(options);
    }
    // 检查是否首次创建活动，显示数据保留提示
    this.checkDataRetentionTip();
  },

  // 检查是否显示数据保留提示
  checkDataRetentionTip() {
    const hasAgreeDefault = wx.getStorageSync('dataRetentionAgreeDefault');
    // 如果用户之前勾选了"默认同意"，则不再显示
    if (hasAgreeDefault) {
      return;
    }
    
    const hasShownTip = wx.getStorageSync('dataRetentionTipShown');
    if (!hasShownTip) {
      this.setData({ showDataRetentionTip: true });
    }
  },

  // 关闭数据保留提示
  closeDataRetentionTip() {
    const { agreeDefault } = this.data;
    
    // 如果勾选了"下次不再显示"，则永久记住
    if (agreeDefault) {
      wx.setStorageSync('dataRetentionTipShown', true);
      wx.setStorageSync('dataRetentionAgreeDefault', true);
    } else {
      // 否则只记录本次已显示（下次还会显示）
      wx.setStorageSync('dataRetentionTipShown', true);
    }
    
    this.setData({ showDataRetentionTip: false });
  },

  // 切换"默认同意"选项
  toggleAgreeDefault() {
    this.setData({
      agreeDefault: !this.data.agreeDefault
    });
  },

  // 切换可见性设置
  onVisibilityChange(e) {
    const visibility = e.currentTarget.dataset.value;
    this.setData({ visibility });
  },

  // 从时间投票预填数据
  fillFromScheduleVote(options) {
    const scheduleDate = decodeURIComponent(options.scheduleDate || '');
    const schedulePeriod = decodeURIComponent(options.schedulePeriod || 'dinner');
    const voteTitle = decodeURIComponent(options.voteTitle || '');

    // 格式化日期显示
    let activityDate = '';
    let activityDateRaw = '';
    if (scheduleDate) {
      const d = new Date(scheduleDate);
      if (!isNaN(d.getTime())) {
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekDay = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        activityDate = `${month}月${day}日 周${weekDay}`;
        activityDateRaw = scheduleDate;
      }
    }

    // 根据时间段设置默认时间
    const dinnerTime = schedulePeriod === 'lunch' ? '12:00' : '18:00';
    const title = voteTitle ? `${voteTitle}聚会` : '';

    this.setData({
      title,
      activityDate,
      activityDateRaw,
      dinnerDate: scheduleDate,
      dinnerTime,
      activityTime: dinnerTime,
      activityTimeRaw: dinnerTime
    });
  },

  // 加载房间数据（编辑模式）
  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });

      // 优先从本地存储读取
      let room = wx.getStorageSync('editRoomData');
      if (room && room.roomId === roomId) {
        wx.removeStorageSync('editRoomData');
      } else {
        // 本地没有，尝试调用云函数
        let result;
        try {
          const res = await wx.cloud.callFunction({
            name: 'getRoom',
            data: { roomId }
          });
          result = res.result;
        } catch (err) {
          const res = await wx.cloud.callFunction({
            name: 'getRoomDetail',
            data: { roomId }
          });
          result = res.result;
        }

        if (result.code !== 0 && !result.success) throw new Error(result.msg || '加载失败');

        room = result.data || result.room;
      }


      // 处理 location 字段
      let locationText = '';
      if (room.location) {
        if (typeof room.location === 'string') {
          locationText = room.location;
        } else if (typeof room.location === 'object') {
          locationText = room.location.name || room.location.address || '';
        }
      }

      // 处理聚餐日期 - 从 activityDate 解析
      let activityDate = '';
      let activityDateRaw = '';
      if (room.activityDate) {
        const dateStr = room.activityDate;
        if (dateStr.includes('-')) {
          // ISO 格式: 2026-05-05
          const parts = dateStr.split('-');
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          activityDate = month + '月' + day + '日';
          activityDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
        } else if (dateStr.includes('月')) {
          // 中文格式: 5月5日
          activityDate = dateStr;
          const match = dateStr.match(/(\d+)月(\d+)日?/);
          if (match) {
            const month = parseInt(match[1]);
            const day = parseInt(match[2]);
            activityDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
          }
        }
      }

      // 处理聚餐时间 - 从 activityTime 解析
      let activityTime = '';
      let activityTimeRaw = '';
      if (room.activityTime) {
        const timeStr = room.activityTime;
        if (timeStr.includes(':')) {
          // 格式: 12:00
          const parts = timeStr.split(':');
          const hour = parseInt(parts[0]);
          const minute = parseInt(parts[1]);
          activityTime = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
          activityTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
        } else if (timeStr.includes('时')) {
          // 中文格式: 12时00分
          activityTime = timeStr;
          const match = timeStr.match(/(\d+)时(\d+)分?/);
          if (match) {
            const hour = parseInt(match[1]);
            const minute = parseInt(match[2]);
            activityTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
          }
        }
      }

      // 处理投票截止时间 - 从 voteDeadline 解析
      let deadlineDate = '';
      let deadlineDateRaw = '';
      let deadlineTime = '';
      let deadlineTimeRaw = '';

      if (room.voteDeadline) {
        const date = new Date(room.voteDeadline);
        if (!isNaN(date.getTime())) {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = date.getHours();
          const minute = date.getMinutes();
          deadlineDate = month + '月' + day + '日';
          deadlineDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
          deadlineTime = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
          deadlineTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
        }
      }

      // 处理海报
      const posters = room.candidatePosters || [];

      // 填充表单数据
      this.setData({
        title: room.title || '',
        location: locationText,
        locationText: locationText,
        peopleCount: room.peopleCount ? String(room.peopleCount) : '',
        posters: posters,
        activityDate: activityDate,
        activityDateRaw: activityDateRaw,
        activityTime: activityTime,
        activityTimeRaw: activityTimeRaw,
        deadlineDate: deadlineDate,
        deadlineDateRaw: deadlineDateRaw,
        deadlineTime: deadlineTime,
        deadlineTimeRaw: deadlineTimeRaw,
        timeAuxiliary: room.timeAuxiliary !== false,
        needPassword: room.needPassword || false,
        roomPassword: room.roomPassword || ''
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
          content: '开启位置权限后，可从地图选择聚会地点，也可手动输入',
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

  // 格式化日期显示（608 -> 6月8日，64 -> 6月4日）
  formatDateDisplay(numbers) {
    if (!numbers) return '';
    // 补齐到4位再解析
    let padded = numbers;
    while (padded.length < 4 && padded.length > 0) {
      padded = '0' + padded;
    }
    if (padded.length < 4) return numbers; // 输入中，不足4位且无法补齐
    const month = parseInt(padded.substring(0, 2), 10);
    const day = parseInt(padded.substring(2, 4), 10);
    return month + '月' + day + '日';
  },

  // 手动输入活动时间
  onTimeInput(e) {
    let value = e.detail.value;

    // 如果值包含中文（时、分），说明是格式化后的值，保持原样不干预
    if (/[时分]/.test(value)) {
      this.setData({ activityTime: value });
      return;
    }

    // 纯数字输入：保持数字原样存入，不在输入过程中转为中文格式
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    this.setData({ activityTime: numbers, activityTimeRaw: numbers });
  },

  // 活动时间输入完成 - 自动补全为时分格式
  onTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 如果没有有效数字，清空
    if (!rawValue || rawValue.length === 0) {
      this.setData({ activityTime: '', activityTimeRaw: '' });
      return;
    }

    // 规则：输入的数字代表小时数，自动补全为整点
    // 输入12 -> 1200 (12:00)
    // 输入6 -> 600 (6:00)
    // 输入00 -> 0000 (00:00)
    // 输入1230 -> 1230 (12:30)
    if (rawValue.length <= 2) {
      // 1-2位数字：补全为4位（代表整点）
      while (rawValue.length < 4) {
        rawValue = rawValue + '0';
      }
    }
    // 如果输入3位数字，自动补零（如183 -> 1830）
    else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    }
    // 超过4位截取前4位
    else if (rawValue.length > 4) {
      rawValue = rawValue.substring(0, 4);
    }

    // 验证时间有效性
    if (rawValue.length === 4) {
      const hour = parseInt(rawValue.substring(0, 2), 10);
      const minute = parseInt(rawValue.substring(2, 4), 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        wx.showToast({ title: '时分格式无效，如 1800', icon: 'none' });
        this.setData({ activityTime: '', activityTimeRaw: '' });
        return;
      }
    }

    // 重新格式化显示
    let displayValue = this.formatTimeDisplay(rawValue);
    this.setData({ activityTime: displayValue, activityTimeRaw: rawValue });
  },

  // 格式化时间显示（12 -> 12时00分，1200 -> 12时00分）
  formatTimeDisplay(numbers) {
    if (!numbers) return '';
    // 补齐到4位再解析
    let padded = numbers;
    while (padded.length < 4 && padded.length > 0) {
      padded = padded + '0';
    }
    if (padded.length < 4) return numbers; // 输入中，不足4位且无法补齐
    const hour = parseInt(padded.substring(0, 2), 10);
    const minute = padded.substring(2);
    return hour + '时' + minute + '分';
  },

  // 手动输入投票截止日期
  onDeadlineDateInput(e) {
    let value = e.detail.value;

    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本，保持原样
    if (/[月日]/.test(value)) {
      this.setData({ deadlineDate: value });
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

  // 截止日期输入完成 - 自动补全为月日格式
  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 如果没有有效数字，清空
    if (!rawValue || rawValue.length === 0) {
      this.setData({ deadlineDate: '', deadlineDateRaw: '' });
      this.updateDeadlineText();
      return;
    }

    // 补齐到4位数字（608 -> 0608）
    while (rawValue.length < 4) {
      rawValue = '0' + rawValue;
    }

    // 验证日期有效性
    if (rawValue.length === 4) {
      const month = parseInt(rawValue.substring(0, 2), 10);
      const day = parseInt(rawValue.substring(2, 4), 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        wx.showToast({ title: '月日格式无效，如 0608', icon: 'none' });
        this.setData({ deadlineDate: '', deadlineDateRaw: '' });
        this.updateDeadlineText();
        return;
      }
    }

    // 重新格式化显示
    let displayValue = this.formatDateDisplay(rawValue);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: rawValue });
    this.updateDeadlineText();
  },

  // 手动输入投票截止时间
  onDeadlineTimeInput(e) {
    let value = e.detail.value;

    // 如果值包含中文（时、分），说明是格式化后的值，保持原样不干预
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers });
      this.updateDeadlineText();
      return;
    }

    // 纯数字输入：保持数字原样存入，不在输入过程中转为中文格式
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    this.setData({ deadlineTime: numbers, deadlineTimeRaw: numbers });
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
          content: '开启位置权限后，可从地图选择聚会地点，也可手动输入',
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
    // 如果包含中文说明是格式化后的值，保持原样不干预
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ dinnerTime: value, dinnerTimeRaw: numbers }, () => this.checkFormValid());
      return;
    }
    // 纯数字输入：保持数字原样存入，不在输入过程中转为中文格式
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    this.setData({ dinnerTime: numbers, dinnerTimeRaw: numbers }, () => this.checkFormValid());
  },

  onDinnerTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    // 没有输入内容则跳过
    if (!rawValue || rawValue.length === 0) return;
    // 自动补全：2位补为整点(12->1200)，3位补零(123->1230)
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    } else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    } else if (rawValue.length > 4) {
      rawValue = rawValue.substring(0, 4);
    }
    // 验证时间有效性
    if (rawValue.length === 4) {
      const hour = parseInt(rawValue.substring(0, 2), 10);
      const minute = parseInt(rawValue.substring(2, 4), 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        wx.showToast({ title: '时分格式无效，如 1800', icon: 'none' });
        this.setData({ dinnerTime: '', dinnerTimeRaw: '' }, () => this.checkFormValid());
        return;
      }
    }
    // 格式化显示
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
    // 如果包含中文说明是格式化后的值，保持原样不干预
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers }, () => this.checkFormValid());
      return;
    }
    // 纯数字输入：保持数字原样存入，不在输入过程中转为中文格式
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    this.setData({ deadlineTime: numbers, deadlineTimeRaw: numbers }, () => this.checkFormValid());
  },

  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    // 没有输入内容则跳过
    if (!rawValue || rawValue.length === 0) return;
    // 自动补全：2位补为整点(12->1200)，3位补零(123->1230)
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    } else if (rawValue.length === 3) {
      rawValue = rawValue + '0';
    } else if (rawValue.length > 4) {
      rawValue = rawValue.substring(0, 4);
    }
    // 验证时间有效性
    if (rawValue.length === 4) {
      const hour = parseInt(rawValue.substring(0, 2), 10);
      const minute = parseInt(rawValue.substring(2, 4), 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        wx.showToast({ title: '时分格式无效，如 1800', icon: 'none' });
        this.setData({ deadlineTime: '', deadlineTimeRaw: '' }, () => this.checkFormValid());
        return;
      }
    }
    // 格式化显示并更新截止时间文本
    if (rawValue.length >= 2) {
      let displayValue = this.formatTimeDisplay(rawValue);
      this.setData({ deadlineTime: displayValue, deadlineTimeRaw: rawValue }, () => {
        this.checkFormValid();
        this.updateDeadlineText();
      });
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

    // 使用 locationText 作为地点（用户输入的值）
    const finalLocation = locationText || location;

    // 使用 Validator 进行详细校验
    const validations = [
      { valid: posters.length >= 1, msg: '请至少上传1张海报' },
      { valid: Validator.string(title, { required: true, minLength: 2, maxLength: 50 }).valid, msg: '标题长度需在2-50个字符之间' },
      { valid: Validator.string(finalLocation, { required: true, minLength: 2, maxLength: 100 }).valid, msg: '地点长度需在2-100个字符之间' },
      { valid: finalActivityDateRaw && finalActivityDateRaw.length >= 2 && finalActivityDateRaw.length <= 4, msg: '请输入2-4位活动日期（如：53、423或0423）' },
      { valid: finalActivityTimeRaw && finalActivityTimeRaw.length === 4, msg: '请输入4位活动时间（如：1830）' },
    ];

    for (const validation of validations) {
      if (!validation.valid) {
        wx.showToast({ title: validation.msg, icon: 'none' });
        return;
      }
    }

    // 内容安全检查
    const contentToCheck = [title, finalLocation].filter(Boolean).join(' ');
    const isContentSafe = await checkContentWithToast(contentToCheck);
    if (!isContentSafe) {
      return;
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

    let formattedDeadlineDate = deadlineDateRaw;
    if (deadlineDateRaw) {
      if (deadlineDateRaw.length === 2) {
        const month = deadlineDateRaw.substring(0, 1);
        const day = deadlineDateRaw.substring(1);
        formattedDeadlineDate = '0' + month + '0' + day;
      } else if (deadlineDateRaw.length === 3) {
        formattedDeadlineDate = '0' + deadlineDateRaw;
      }
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

              // 注意：mediaCheckAsync 是异步接口，无法立即返回结果
              // 图片检测改为后台异步进行，不阻塞创建活动流程
              // 如果后续检测发现违规，可通过消息推送通知用户
              this.performAsyncImageCheck(fileID, title);

              return { imageUrl: fileID, platformSource: p.platformSource || '' };
            } catch (uploadErr) {
              throw new Error(uploadErr.message || `第${idx + 1}张海报上传失败，请重试`);
            }
          })
        );
      }
      

      let result;
      
      // 处理付款方式：空或 hidden 表示不显示，后端默认 treat
      const finalPaymentMode = this.data.paymentMode === 'hidden' ? '' : this.data.paymentMode;
      
      if (this.data.isEditMode) {
        // 编辑模式：调用更新接口
        result = await wx.cloud.callFunction({
          name: 'updateRoom',
          timeout: 60000,
          data: {
            roomId: this.data.editRoomId,
            title,
            location: finalLocation,
            peopleCount: parseInt(peopleCount) || 0,
            activityDate: fullActivityDate,
            activityTime: fullActivityTime,
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary,
            paymentMode: finalPaymentMode
          }
        });
      } else {
        // 获取用户信息
        const userInfo = wx.getStorageSync('userInfo') || {};
        // 获取用户城市
        const userCity = wx.getStorageSync('userCity') || null;
        
        // 创建模式
        console.log('[create-mode-a] 创建活动，传入 mode:', 'a');
        result = await wx.cloud.callFunction({
          name: 'createRoom',
          timeout: 60000,
          data: {
            title,
            location: finalLocation,
            peopleCount: parseInt(peopleCount) || 0,
            activityDate: fullActivityDate,
            activityTime: fullActivityTime,
            mode: 'a',
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary,
            creatorNickName: userInfo.nickName || '',
            creatorAvatarUrl: userInfo.avatarUrl || '',
            paymentMode: finalPaymentMode,
            // 隐私设置
            visibility: this.data.visibility,
            city: userCity ? {
              country: userCity.country,
              countryCode: userCity.countryCode,
              region: userCity.region,
              city: userCity.city,
              cityCode: userCity.cityCode,
              isDomestic: userCity.isDomestic
            } : null
          }
        });
        console.log('[create-mode-a] 创建结果:', result.result);
      }

      if (result.result.code !== 0) throw new Error(result.result.msg);

      wx.hideLoading();
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
      wx.showToast({
        title: this.data.isEditMode ? '保存成功' : '创建成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.redirectTo({ url: `/package-vote/pages/control/control?roomId=${this.data.isEditMode ? this.data.editRoomId : result.result.data.roomId}` });
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


      if (res[tmplIds[0]] === 'accept' || res[tmplIds[1]] === 'accept' || res[tmplIds[2]] === 'accept') {
        await wx.cloud.callFunction({
          name: 'saveSubscription',
          data: {
            subscriptions: res
          }
        });
      }
    } catch (err) {
    }
  },

  /**
   * 异步图片内容安全检测
   * mediaCheckAsync 是异步接口，无法立即返回结果
   * 此方法不阻塞主流程，仅记录检测状态
   * @param {string} fileID - 图片云存储 fileID
   * @param {string} title - 活动标题，用于检测场景
   */
  async performAsyncImageCheck(fileID, title = '') {
    try {
      // 异步调用媒体检测，不等待结果
      wx.cloud.callFunction({
        name: 'mediaCheck',
        data: {
          mediaUrl: fileID,
          mediaType: 2,
          scene: 2,
          title: title
        }
      }).then(res => {
        console.log('异步图片检测结果:', JSON.stringify(res.result || {}));
      }).catch(err => {
        console.error('异步图片检测失败:', err);
      });
    } catch (err) {
      console.error('启动异步图片检测失败:', err);
    }
  },
});
