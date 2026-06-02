const app = getApp();

Component({
  properties: {
    // 标题配置
    title: {
      type: String,
      value: '橘仔宣布'
    },
    subtitle: {
      type: String,
      value: '本次聚会地点已定'
    },
    // 海报图片
    posterImageUrl: {
      type: String,
      value: ''
    },
    platformSource: {
      type: String,
      value: ''
    },
    // 投票统计
    showVoteStats: {
      type: Boolean,
      value: false
    },
    votePercent: {
      type: Number,
      value: 0
    },
    voters: {
      type: Array,
      value: []
    },
    // 信息展示
    shopName: {
      type: String,
      value: ''
    },
    time: {
      type: String,
      value: ''
    },
    address: {
      type: String,
      value: ''
    },
    // 包间号
    showRoomAddition: {
      type: Boolean,
      value: false
    },
    roomAddition: {
      type: String,
      value: ''
    },
    // 模式控制
    isPoster: {
      type: Boolean,
      value: false
    },
    showActions: {
      type: Boolean,
      value: false
    },
    showBottomActions: {
      type: Boolean,
      value: true
    },
    showShare: {
      type: Boolean,
      value: true
    },
    showPosterBtn: {
      type: Boolean,
      value: true
    }
  },

  data: {
    imagePaths: {}
  },

  lifetimes: {
    attached() {
      // 获取图片路径
      const app = getApp();
      if (app.whenImageReady) {
        app.whenImageReady().then(paths => {
          this.setData({ imagePaths: paths });
        });
      }
    }
  },

  methods: {
    // 预览海报图片
    previewPoster() {
      if (this.data.posterImageUrl) {
        wx.previewImage({
          urls: [this.data.posterImageUrl],
          current: this.data.posterImageUrl
        });
      }
      this.triggerEvent('previewPoster');
    },

    // 复制地址
    copyAddress() {
      const address = this.data.address;
      if (address) {
        wx.setClipboardData({
          data: address,
          success: () => {
            wx.showToast({ title: '地址已复制', icon: 'success' });
          }
        });
      }
      this.triggerEvent('copyAddress', { address });
    },

    // 导航
    openNavigation() {
      const address = this.data.address;
      if (!address) {
        wx.showToast({ title: '暂无地址信息', icon: 'none' });
        return;
      }

      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          wx.showActionSheet({
            itemList: ['使用腾讯地图导航', '复制地址'],
            success: (actionRes) => {
              if (actionRes.tapIndex === 0) {
                wx.openLocation({
                  latitude: res.latitude,
                  longitude: res.longitude,
                  name: '目的地',
                  address: address,
                  scale: 16
                });
              } else {
                wx.setClipboardData({ data: address });
              }
            }
          });
        },
        fail: () => {
          wx.setClipboardData({
            data: address,
            success: () => { wx.showToast({ title: '地址已复制', icon: 'success' }); }
          });
        }
      });
      this.triggerEvent('openNavigation', { address });
    },

    // 添加到日历
    addToCalendar() {
      const time = this.data.time;
      if (!time) {
        wx.showToast({ title: '暂无时间信息', icon: 'none' });
        return;
      }
      this.triggerEvent('addToCalendar', { time });
    },

    // 包间号输入
    onRoomAdditionInput(e) {
      this.triggerEvent('roomAdditionInput', { value: e.detail.value });
    },

    // 保存包间号
    saveRoomAddition() {
      this.triggerEvent('saveRoomAddition');
    },

    // 显示海报
    showPoster() {
      this.triggerEvent('showPoster');
    }
  }
});
