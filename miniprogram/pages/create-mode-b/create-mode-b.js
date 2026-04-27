// pages/create-mode-b/create-mode-b.js
const { generateRoomId } = require('../../utils/uuid.js');

Page({
  data: {
    title: '',
    location: {},
    locationText: '',
    // 聚餐时间 - 月日|时分格式（带中文显示）
    dinnerDate: '',
    dinnerDateRaw: '',
    dinnerTime: '',
    dinnerTimeRaw: '',
    dinnerTimeValue: null,
    // 投票截止时间 - 月日|时分格式（带中文显示）
    deadlineDate: '',
    deadlineDateRaw: '',
    deadlineTime: '',
    deadlineTimeRaw: '',
    deadline: null,
    // 付费方式
    paymentMode: 'AA',
    // 匿名投票
    isAnonymous: false,
    // 是否可以提交
    canSubmit: false
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
        location: room.location || {},
        locationText: room.location?.name || '',
        paymentMode: room.paymentMode || 'AA',
        isAnonymous: room.isAnonymous || false
      }, () => {
        this.checkCanSubmit();
      });
      
      // 处理聚餐时间
      if (room.dinnerTime) {
        const dinnerDate = new Date(room.dinnerTime);
        this.setData({
          dinnerDate: this.formatDate(dinnerDate),
          dinnerDateRaw: dinnerDate,
          dinnerTime: this.formatTime(dinnerDate),
          dinnerTimeRaw: dinnerDate,
          dinnerTimeValue: room.dinnerTime
        });
      }
      
      // 处理截止时间
      if (room.voteDeadline) {
        const deadlineDate = new Date(room.voteDeadline);
        this.setData({
          deadlineDate: this.formatDate(deadlineDate),
          deadlineDateRaw: deadlineDate,
          deadlineTime: this.formatTime(deadlineDate),
          deadlineTimeRaw: deadlineDate,
          deadline: room.voteDeadline
        });
      }
      
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 格式化日期
  formatDate(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 格式化时间
  formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}点${minutes}分`;
  },

  // 检查表单是否可提交
  checkCanSubmit() {
    const hasTitle = this.data.title.trim() !== '';
    const hasLocation = this.data.locationText.trim() !== '';
    const hasDinnerTime = this.data.dinnerDate && this.data.dinnerTime;
    const hasDeadline = this.data.deadlineDate && this.data.deadlineTime;
    const canSubmit = hasTitle && hasLocation && hasDinnerTime && hasDeadline;
    
    // 确保时间对象已更新
    if (canSubmit) {
      this.updateDinnerTime();
      this.updateDeadline();
    }
    
    this.setData({ canSubmit });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value }, () => {
      this.checkCanSubmit();
    });
  },

  // 手动输入地点
  onLocationInput(e) {
    this.setData({ 
      locationText: e.detail.value,
      location: { name: e.detail.value }
    }, () => {
      this.checkCanSubmit();
    });
  },

  // 选择地图位置
  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        let locationName = res.name || '';
        let address = res.address || '';
        let fullLocation = locationName;
        if (address && !locationName.includes(address)) {
          fullLocation = locationName ? `${locationName}（${address}）` : address;
        }
        if (!fullLocation) {
          fullLocation = '未知位置';
        }
        this.setData({
          locationText: fullLocation,
          location: {
            name: fullLocation,
            address: address,
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          return;
        }
        wx.showToast({
          title: '请授权位置权限',
          icon: 'none'
        });
      }
    });
  },

  // ========== 聚餐日期输入 ==========
  onDinnerDateInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（月、日），说明用户正在编辑格式化后的文本
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ dinnerDate: value, dinnerDateRaw: numbers });
      return;
    }
    
    // 纯数字输入，进行格式化
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ dinnerDate: displayValue, dinnerDateRaw: numbers });
  },

  onDinnerDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 3位数字时，首位补零
    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 只要有内容就更新，确保验证能通过
    let displayValue = this.formatDateDisplay(rawValue);
    this.setData({ dinnerDate: displayValue, dinnerDateRaw: rawValue }, () => {
      this.checkCanSubmit();
    });
    this.updateDinnerTime();
  },

  // ========== 聚餐时间输入 ==========
  onDinnerTimeInput(e) {
    let value = e.detail.value;
    
    // 如果值包含中文（时、分）
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ dinnerTime: value, dinnerTimeRaw: numbers });
      return;
    }
    
    // 纯数字输入
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ dinnerTime: displayValue, dinnerTimeRaw: numbers });
  },

  onDinnerTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    // 2位数字自动补全为整点
    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    }

    // 只要有内容就更新，确保验证能通过
    let displayValue = this.formatTimeDisplay(rawValue);
    this.setData({ dinnerTime: displayValue, dinnerTimeRaw: rawValue }, () => {
      this.checkCanSubmit();
    });
    this.updateDinnerTime();
  },

  // ========== 截止日期输入 ==========
  onDeadlineDateInput(e) {
    let value = e.detail.value;
    
    if (/[月日]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineDate: value, deadlineDateRaw: numbers });
      return;
    }
    
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: numbers });
  },

  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }

    // 只要有内容就更新，确保验证能通过
    let displayValue = this.formatDateDisplay(rawValue);
    this.setData({ deadlineDate: displayValue, deadlineDateRaw: rawValue }, () => {
      this.checkCanSubmit();
    });
    this.updateDeadline();
  },

  // ========== 截止时间输入 ==========
  onDeadlineTimeInput(e) {
    let value = e.detail.value;
    
    if (/[时分]/.test(value)) {
      let numbers = value.replace(/\D/g, '');
      this.setData({ deadlineTime: value, deadlineTimeRaw: numbers });
      return;
    }
    
    let numbers = value.replace(/\D/g, '');
    if (numbers.length > 4) numbers = numbers.substring(0, 4);
    let displayValue = this.formatTimeDisplay(numbers);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: numbers });
  },

  onDeadlineTimeBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');

    if (rawValue.length === 2) {
      rawValue = rawValue + '00';
    }

    // 只要有内容就更新，确保验证能通过
    let displayValue = this.formatTimeDisplay(rawValue);
    this.setData({ deadlineTime: displayValue, deadlineTimeRaw: rawValue }, () => {
      this.checkCanSubmit();
    });
    this.updateDeadline();
  },

  // ========== 格式化方法 ==========
  formatDateDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
    }
    // 3位数字：第一位是月，后两位是日
    if (numbers.length === 3) {
      const m = numbers.substring(0, 1);
      const d = numbers.substring(1);
      return m + '月' + d + '日';
    }
    // 4位数字
    const month = numbers.substring(0, 2);
    const day = numbers.substring(2);
    return month + '月' + day + '日';
  },

  formatTimeDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
    }
    // 3位数字
    if (numbers.length === 3) {
      const h = numbers.substring(0, 2);
      const m = numbers.substring(2);
      return h + '时' + m + '分';
    }
    // 4位数字
    const hour = numbers.substring(0, 2);
    const minute = numbers.substring(2);
    return hour + '时' + minute + '分';
  },

  // ========== 更新时间对象 ==========
  updateDinnerTime() {
    const { dinnerDateRaw, dinnerTimeRaw } = this.data;
    if (dinnerDateRaw && dinnerDateRaw.length >= 3 && dinnerTimeRaw && dinnerTimeRaw.length >= 4) {
      const now = new Date();
      const year = now.getFullYear();
      let month, day;
      
      if (dinnerDateRaw.length === 3) {
        month = parseInt(dinnerDateRaw.substring(0, 1)) - 1;
        day = parseInt(dinnerDateRaw.substring(1));
      } else {
        month = parseInt(dinnerDateRaw.substring(0, 2)) - 1;
        day = parseInt(dinnerDateRaw.substring(2));
      }
      
      const hour = parseInt(dinnerTimeRaw.substring(0, 2));
      const minute = parseInt(dinnerTimeRaw.substring(2));
      const dinnerTimeValue = new Date(year, month, day, hour, minute, 0);
      this.setData({ dinnerTimeValue });
    }
  },

  updateDeadline() {
    const { deadlineDateRaw, deadlineTimeRaw } = this.data;
    if (deadlineDateRaw && deadlineDateRaw.length >= 3 && deadlineTimeRaw && deadlineTimeRaw.length >= 4) {
      const now = new Date();
      const year = now.getFullYear();
      let month, day;
      
      if (deadlineDateRaw.length === 3) {
        month = parseInt(deadlineDateRaw.substring(0, 1)) - 1;
        day = parseInt(deadlineDateRaw.substring(1));
      } else {
        month = parseInt(deadlineDateRaw.substring(0, 2)) - 1;
        day = parseInt(deadlineDateRaw.substring(2));
      }
      
      const hour = parseInt(deadlineTimeRaw.substring(0, 2));
      const minute = parseInt(deadlineTimeRaw.substring(2));
      const deadline = new Date(year, month, day, hour, minute, 0);
      this.setData({ deadline });
    }
  },

  // 付费方式切换
  onPaymentModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ paymentMode: mode });
  },

  // 匿名投票切换
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
  },

  canSubmit() {
    const hasTitle = this.data.title.trim() !== '';
    const hasLocation = this.data.locationText.trim() !== '';
    const hasDinnerTime = this.data.dinnerDateRaw && this.data.dinnerTimeRaw;
    const hasDeadline = this.data.deadlineDateRaw && this.data.deadlineTimeRaw;
    return hasTitle && hasLocation && hasDinnerTime && hasDeadline;
  },

  async createRoom() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }

    // 验证截止时间不能早于当前时间
    if (this.data.deadline) {
      const now = new Date();
      if (this.data.deadline <= now) {
        wx.showToast({ title: '截止时间不能早于当前时间', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: this.data.isEditMode ? '保存中...' : '创建中...' });

    try {
      let result;
      
      if (this.data.isEditMode) {
        // 编辑模式：调用更新接口
        result = await wx.cloud.callFunction({
          name: 'updateRoom',
          data: {
            roomId: this.data.editRoomId,
            title: this.data.title,
            location: this.data.location,
            dinnerTime: this.data.dinnerTimeValue,
            voteDeadline: this.data.deadline,
            paymentMode: this.data.paymentMode,
            isAnonymous: this.data.isAnonymous
          }
        });
      } else {
        // 创建模式
        const roomId = generateRoomId();
        result = await wx.cloud.callFunction({
          name: 'createRoom',
          data: {
            roomId,
            mode: 'b',
            title: this.data.title,
            location: this.data.location,
            dinnerTime: this.data.dinnerTimeValue,
            voteDeadline: this.data.deadline,
            paymentMode: this.data.paymentMode,
            isAnonymous: this.data.isAnonymous
          }
        });
      }

      wx.hideLoading();

      if (result.result.code === 0) {
        wx.showToast({ 
          title: this.data.isEditMode ? '保存成功' : '创建成功', 
          icon: 'success' 
        });
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/control/control?roomId=${this.data.isEditMode ? this.data.editRoomId : result.result.data.roomId}`
          });
        }, 1500);
      } else {
        throw new Error(result.result.msg || (this.data.isEditMode ? '保存失败' : '创建失败'));
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: (this.data.isEditMode ? '保存失败：' : '创建失败：') + err.message, icon: 'none' });
    }
  }
});
