Page({
  data: {
    roomId: '',
    room: {},
    loading: true,
    isCreator: false,
    platformAppIds: {
      meituan: 'wxde8ac0a21135c07d',
      dianping: 'wxc0d6fdfa1c166f6c',
      jd: 'wx91d27dbf599dff74'
    }
  },

  onLoad(options) {
    const { roomId } = options;
    this.setData({ roomId });
    this.loadRoomData();
  },

  onShow() {
    if (this.data.roomId) {
      this.loadRoomData();
    }
  },

  async loadRoomData() {
    try {
      this.setData({ loading: true });
      
      const { result } = await wx.cloud.callFunction({
        name: 'getRoom',
        data: { roomId: this.data.roomId }
      });

      if (result.code !== 0) {
        throw new Error(result.msg);
      }

      const room = result.data;
      
      this.setData({
        room,
        isCreator: room.isCreator,
        loading: false
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
    }
  },

  // 预览海报
  previewPoster() {
    const finalPoster = this.data.room.finalPoster;
    if (finalPoster && finalPoster.imageUrl) {
      wx.previewImage({
        urls: [finalPoster.imageUrl],
        current: finalPoster.imageUrl
      });
    }
  },

  // 跳转到平台小程序
  goToPlatform() {
    const { room, platformAppIds } = this.data;
    const platform = room.finalPoster?.platformSource || room.platform;
    
    if (!platform || !platformAppIds[platform]) {
      wx.showToast({ title: '未知平台', icon: 'none' });
      return;
    }

    const appId = platformAppIds[platform];
    
    wx.navigateToMiniProgram({
      appId,
      path: 'pages/index/index',
      extraData: { from: 'miaolegeyu' },
      success: () => {
        console.log('跳转成功');
      },
      fail: (err) => {
        console.log('跳转失败', err);
        wx.showToast({ title: '跳转失败，请手动打开', icon: 'none' });
      }
    });
  },

  // 复制地址
  copyAddress() {
    const address = this.data.room.finalPoster?.address;
    if (address) {
      wx.setClipboardData({
        data: address,
        success: () => {
          wx.showToast({ title: '地址已复制', icon: 'success' });
        }
      });
    }
  },

  // 导航去店
  openNavigation() {
    const address = this.data.room.finalPoster?.address;
    if (!address) {
      wx.showToast({ title: '暂无地址信息', icon: 'none' });
      return;
    }

    wx.showActionSheet({
      itemList: ['使用高德地图', '使用腾讯地图'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 高德地图
          wx.navigateTo({
            url: `plugin://chooseLocation/index?key=YOUR_AMAP_KEY&referer=miaolegeyu&location=${JSON.stringify({})}&address=${address}`
          });
        } else {
          // 腾讯地图
          wx.openLocation({
            address,
            scale: 18
          });
        }
      }
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 去结算
  goSettlement() {
    wx.navigateTo({
      url: `/pages/settlement/settlement?roomId=${this.data.roomId}`
    });
  },

  // 分享
  onShareAppMessage() {
    const { room, roomId } = this.data;
    return {
      title: `【${room.title}】投票结果出炉！`,
      path: `/pages/result/result?roomId=${roomId}`,
      imageUrl: room.finalPoster?.imageUrl || ''
    };
  }
});
