Page({
  data: {
    posters: [],
    showPlatformPopup: false,
    selectedPlatform: '',
    editingPosterIndex: -1,
    title: '',
    location: '',
    peopleCount: '',
    deadlineText: '',
    activityDate: '',
    activityTime: '',
    deadlineDate: '',
    deadlineTime: '',
    timeAuxiliary: true,
    groupOrderOption: false,
    canCreate: false,
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
        peopleCount: room.peopleCount ? String(room.peopleCount) : '',
        posters: room.candidatePosters || [],
        activityDate: room.activityDate || '',
        activityTime: room.activityTime || '',
        deadlineDate: room.voteDeadline ? room.voteDeadline.split('T')[0] : '',
        deadlineTime: room.voteDeadline ? room.voteDeadline.split('T')[1].slice(0, 5) : '',
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
    const { posters, title } = this.data;
    const canCreate = posters.length >= 1 && title.trim() !== '';
    this.setData({ canCreate });
  },

  addPoster() {
    wx.chooseMedia({
      count: 6 - this.data.posters.length,
      mediaType: ['image'],
      sourceType: ['album'],
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
    this.setData({ location: e.detail.value });
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
        
        this.setData({ location: fullLocation });
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消，不做处理
          return;
        }
        // 如果没有权限，提示用户
        wx.showToast({
          title: '请授权位置权限',
          icon: 'none'
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
    // 格式化为月日显示
    let displayValue = this.formatDateDisplay(numbers);
    this.setData({ activityDate: displayValue, activityDateRaw: numbers });
  },

  // 活动日期输入完成 - 3位数字自动补零
  onDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    
    // 3位数字时，首位补零
    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }
    
    // 重新格式化显示
    if (rawValue.length >= 3) {
      let displayValue = this.formatDateDisplay(rawValue);
      this.setData({ activityDate: displayValue, activityDateRaw: rawValue });
    }
  },

  // 格式化日期显示（0424 -> 04月24日）
  formatDateDisplay(numbers) {
    if (!numbers) return '';
    if (numbers.length <= 2) {
      return numbers;
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

  // 截止日期输入完成 - 3位数字自动补零
  onDeadlineDateBlur(e) {
    let value = e.detail.value;
    let rawValue = value.replace(/\D/g, '');
    
    // 3位数字时，首位补零
    if (rawValue.length === 3) {
      rawValue = '0' + rawValue;
    }
    
    // 重新格式化显示
    if (rawValue.length >= 3) {
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

  async createRoom() {
    const { title, location, peopleCount, activityDateRaw, activityTimeRaw, posters, deadlineDateRaw, deadlineTimeRaw, timeAuxiliary } = this.data;

    if (posters.length < 1) {
      wx.showToast({ title: '请至少上传1张海报', icon: 'none' });
      return;
    }

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }

    // 验证日期格式（支持3位或4位）
    if (!activityDateRaw || (activityDateRaw.length !== 3 && activityDateRaw.length !== 4)) {
      wx.showToast({ title: '请输入3-4位活动日期（如：423或0423）', icon: 'none' });
      return;
    }
    if (!activityTimeRaw || activityTimeRaw.length !== 4) {
      wx.showToast({ title: '请输入4位活动时间（如：1830）', icon: 'none' });
      return;
    }

    // 格式化日期为4位
    const formattedActivityDate = activityDateRaw.length === 3 ? '0' + activityDateRaw : activityDateRaw;
    const formattedDeadlineDate = deadlineDateRaw && deadlineDateRaw.length === 3 ? '0' + deadlineDateRaw : deadlineDateRaw;

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
        voteDeadline = parsed;
      }
    }

    // 构建活动日期（添加当前年份）
    const currentYear = new Date().getFullYear();
    const activityMonth = formattedActivityDate.substring(0, 2);
    const activityDay = formattedActivityDate.substring(2, 4);
    const fullActivityDate = `${currentYear}-${activityMonth}-${activityDay}`;

    // 构建活动时间（添加冒号）
    const activityHour = activityTimeRaw.substring(0, 2);
    const activityMinute = activityTimeRaw.substring(2, 4);
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
          posters.map(async (p) => {
            if (!p.tempFilePath) return p;
            const { fileID } = await wx.cloud.uploadFile({
              cloudPath: `posters/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
              filePath: p.tempFilePath
            });
            return { imageUrl: fileID, platformSource: p.platformSource };
          })
        );
      }

      let result;
      
      if (this.data.isEditMode) {
        // 编辑模式：调用更新接口
        result = await wx.cloud.callFunction({
          name: 'updateRoom',
          data: {
            roomId: this.data.editRoomId,
            title,
            location,
            peopleCount: parseInt(peopleCount) || 0,
            activityDate: fullActivityDate,
            activityTime: fullActivityTime,
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary
          }
        });
      } else {
        // 创建模式
        result = await wx.cloud.callFunction({
          name: 'createRoom',
          data: {
            title,
            location,
            peopleCount: parseInt(peopleCount) || 0,
            activityDate: fullActivityDate,
            activityTime: fullActivityTime,
            mode: 'pick_for_them',
            candidatePosters: uploadedPosters,
            voteDeadline: voteDeadline.toISOString(),
            timeAuxiliary
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
