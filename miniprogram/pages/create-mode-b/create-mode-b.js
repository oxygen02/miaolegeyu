// pages/create-mode-b/create-mode-b.js
const { generateRoomId } = require('../../utils/uuid.js');
const { imagePaths } = require('../../config/imageConfig');

Page({
  data: {
    imagePaths: imagePaths,
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
    // 房间密码
    needPassword: false,
    roomPassword: '',
    // 是否启用餐厅推荐
    enableRestaurantRecommend: false,
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

  // 标记表单是否被修改过
  markAsModified() {
    if (this.data.isEditMode && !this.data.isModified) {
      this.setData({ isModified: true });
    }
  },

  // 加载房间数据（编辑模式）
  async loadRoomData(roomId) {
    try {
      wx.showLoading({ title: '加载中' });

      // 优先从本地存储读取
      let room = wx.getStorageSync('editRoomData');
      if (room && room.roomId === roomId) {
        console.log('从本地存储读取房间数据:', room);
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
          console.log('getRoom 失败，尝试 getRoomDetail:', err);
          const res = await wx.cloud.callFunction({
            name: 'getRoomDetail',
            data: { roomId }
          });
          result = res.result;
        }

        if (result.code !== 0 && !result.success) throw new Error(result.msg || '加载失败');

        room = result.data || result.room;
      }

      console.log('编辑模式加载房间数据:', room);

      // 填充表单数据
      // 处理 location 字段，可能是对象或字符串
      let locationObj = {};
      let locationText = '';
      if (room.location) {
        if (typeof room.location === 'string') {
          locationText = room.location;
          locationObj = { name: room.location };
        } else if (typeof room.location === 'object') {
          locationObj = room.location;
          locationText = room.location.name || room.location.address || '';
        }
      }

      // 处理聚餐时间 - 模式B（你们来定）使用 dinnerTime 或 appointmentDate
      let dinnerDateRaw = '';
      let dinnerTimeRaw = '';
      let dinnerDate = '';
      let dinnerTime = '';
      let dinnerTimeValue = null;

      // 优先从 dinnerTime 或 appointmentDate 解析（模式B的主要字段）
      const dateValue = room.dinnerTime || room.appointmentDate;
      if (dateValue) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = date.getHours();
          const minute = date.getMinutes();
          dinnerDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
          dinnerDate = month + '月' + day + '日';
          dinnerTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
          dinnerTime = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
          dinnerTimeValue = date;
        }
      } else if (room.activityDate && room.activityTime) {
        // 备选：从 activityDate 和 activityTime 解析
        const dateStr = room.activityDate;
        const timeStr = room.activityTime;

        let year, month, day;
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-');
          year = parseInt(parts[0]);
          month = parseInt(parts[1]);
          day = parseInt(parts[2]);
        } else if (dateStr.includes('月')) {
          const match = dateStr.match(/(\d+)月(\d+)日?/);
          if (match) {
            month = parseInt(match[1]);
            day = parseInt(match[2]);
          }
        }

        let hour, minute;
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          hour = parseInt(parts[0]);
          minute = parseInt(parts[1]);
        } else if (timeStr.includes('时')) {
          const match = timeStr.match(/(\d+)时(\d+)分?/);
          if (match) {
            hour = parseInt(match[1]);
            minute = parseInt(match[2]);
          }
        }

        if (month && day) {
          dinnerDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
          dinnerDate = month + '月' + day + '日';
        }
        if (hour !== undefined && minute !== undefined) {
          dinnerTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
          dinnerTime = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
          if (year && month && day) {
            dinnerTimeValue = new Date(year, month - 1, day, hour, minute, 0);
          }
        }
      }

      // 处理投票截止时间 - 从 voteDeadline 解析
      let deadlineDateRaw = '';
      let deadlineTimeRaw = '';
      let deadlineDate = '';
      let deadlineTime = '';
      let deadline = null;

      if (room.voteDeadline) {
        const date = new Date(room.voteDeadline);
        if (!isNaN(date.getTime())) {
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const hour = date.getHours();
          const minute = date.getMinutes();
          deadlineDateRaw = (month < 10 ? '0' : '') + month + (day < 10 ? '0' : '') + day;
          deadlineDate = month + '月' + day + '日';
          deadlineTimeRaw = (hour < 10 ? '0' : '') + hour + (minute < 10 ? '0' : '') + minute;
          deadlineTime = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
          deadline = room.voteDeadline;
        }
      }

      // 处理海报
      const posters = room.candidatePosters || [];

      this.setData({
        title: room.title || '',
        location: locationObj,
        locationText: locationText,
        paymentMode: room.paymentMode || 'AA',
        isAnonymous: room.isAnonymous || false,
        needPassword: room.needPassword || false,
        roomPassword: room.roomPassword || '',
        enableRestaurantRecommend: room.enableRestaurantRecommend || false,
        dinnerDate: dinnerDate,
        dinnerDateRaw: dinnerDateRaw,
        dinnerTime: dinnerTime,
        dinnerTimeRaw: dinnerTimeRaw,
        dinnerTimeValue: dinnerTimeValue,
        deadlineDate: deadlineDate,
        deadlineDateRaw: deadlineDateRaw,
        deadlineTime: deadlineTime,
        deadlineTimeRaw: deadlineTimeRaw,
        deadline: deadline,
        posters: posters,
        // 编辑模式下初始状态设为不可提交，需要用户修改后才能提交
        canSubmit: false,
        isModified: false
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载房间数据失败:', err);
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
    const formValid = this.canSubmit();
    // 编辑模式下需要用户修改过数据才能提交
    const canSubmit = this.data.isEditMode ? (formValid && this.data.isModified) : formValid;
    
    // 确保时间对象已更新
    if (formValid) {
      this.updateDinnerTime();
      this.updateDeadline();
    }
    
    this.setData({ canSubmit });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value }, () => {
      this.markAsModified();
      this.checkCanSubmit();
    });
  },

  // 手动输入地点
  onLocationInput(e) {
    this.setData({ 
      locationText: e.detail.value,
      location: { name: e.detail.value }
    }, () => {
      this.markAsModified();
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
        this.markAsModified();
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
      this.markAsModified();
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
      this.markAsModified();
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
      this.markAsModified();
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
      this.markAsModified();
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
    this.markAsModified();
  },

  // 匿名投票切换
  onAnonymousChange(e) {
    this.setData({ isAnonymous: e.detail.value });
    this.markAsModified();
  },

  // 密码开关切换
  onPasswordSwitchChange(e) {
    const needPassword = e.detail.value;
    // 编辑模式下保留原有密码，创建模式或关闭再打开时清空密码
    const roomPassword = (this.data.isEditMode && needPassword) ? this.data.roomPassword : '';
    this.setData({ 
      needPassword: needPassword,
      roomPassword: roomPassword
    }, () => {
      this.markAsModified();
      this.checkCanSubmit();
    });
  },

// 密码输入
onPasswordInput(e) {
this.setData({ roomPassword: e.detail.value }, () => {
this.markAsModified();
this.checkCanSubmit();
});
},

// 餐厅推荐开关
onRecommendSwitchChange(e) {
this.setData({
enableRestaurantRecommend: e.detail.value
});
this.markAsModified();
},

  canSubmit() {
    const hasTitle = this.data.title.trim() !== '';
    const hasLocation = this.data.locationText.trim() !== '';
    const hasDinnerTime = this.data.dinnerDateRaw && this.data.dinnerTimeRaw;
    const hasDeadline = this.data.deadlineDateRaw && this.data.deadlineTimeRaw;
    // 如果开启密码，需要输入4-6位密码
    const passwordValid = !this.data.needPassword || (this.data.roomPassword.length >= 4 && this.data.roomPassword.length <= 6);
    return hasTitle && hasLocation && hasDinnerTime && hasDeadline && passwordValid;
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
            isAnonymous: this.data.isAnonymous,
            needPassword: this.data.needPassword,
            roomPassword: this.data.needPassword ? this.data.roomPassword : '',
            enableRestaurantRecommend: this.data.enableRestaurantRecommend
          }
        });
      } else {
        // 创建模式
        const roomId = generateRoomId();
        result = await wx.cloud.callFunction({
          name: 'createRoom',
          data: {
            roomId,
            mode: 'pick_for_them',
            title: this.data.title,
            location: this.data.location,
            dinnerTime: this.data.dinnerTimeValue,
            voteDeadline: this.data.deadline,
            paymentMode: this.data.paymentMode,
            isAnonymous: this.data.isAnonymous,
            needPassword: this.data.needPassword,
            roomPassword: this.data.needPassword ? this.data.roomPassword : '',
            enableRestaurantRecommend: this.data.enableRestaurantRecommend
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
