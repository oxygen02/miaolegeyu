Component({
  properties: {
    selectedTime: {
      type: String,
      value: ''
    }
  },

  data: {
    showPicker: false,
    days: [],
    times: [],
    dayIndex: 0,
    timeIndex: 0
  },

  lifetimes: {
    attached() {
      this.generateDays();
      this.generateTimes();
    }
  },

  methods: {
    // 生成未来7天的月日选择
    generateDays() {
      const days = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        days.push(`${month}月${day}日`);
      }
      
      this.setData({ days });
    },

    // 生成时间选项（含半小时）
    generateTimes() {
      const times = [];
      const startHour = 11;
      const endHour = 21;
      
      for (let hour = startHour; hour <= endHour; hour++) {
        times.push(`${hour}:00`);
        if (hour < endHour) {
          times.push(`${hour}:30`);
        }
      }
      
      this.setData({ times });
    },

    showPicker() {
      this.setData({ showPicker: true });
      this.parseSelectedTime();
    },

    hidePicker() {
      this.setData({ showPicker: false });
    },

    preventBubble() {
      // 阻止事件冒泡
    },

    parseSelectedTime() {
      const { selectedTime, days, times } = this.data;
      if (!selectedTime) {
        this.setData({ dayIndex: 0, timeIndex: 0 });
        return;
      }

      const parts = selectedTime.split(' ');
      if (parts.length === 2) {
        const dayIdx = days.indexOf(parts[0]);
        const timeIdx = times.indexOf(parts[1]);
        this.setData({
          dayIndex: dayIdx >= 0 ? dayIdx : 0,
          timeIndex: timeIdx >= 0 ? timeIdx : 0
        });
      }
    },

    selectDay(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({ dayIndex: index });
    },

    selectTime(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({ timeIndex: index });
    },

    confirmPicker() {
      const { days, times, dayIndex, timeIndex } = this.data;
      const selectedTime = `${days[dayIndex]} ${times[timeIndex]}`;
      
      this.setData({ showPicker: false });
      this.triggerEvent('change', { selectedTime });
    }
  }
});
