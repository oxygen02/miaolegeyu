const PosterGenerator = getApp().globalData.poster;

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer(newVal, oldVal) {
        if (newVal && !oldVal) {
          // 打开时：重置状态 + 禁止页面滚动
          this.setData({
            isLoading: true,
            posterImagePath: ''
          });
          // 禁止背景页面滚动
          if (wx.setPageStyle) {
            wx.setPageStyle({ style: { overflow: 'hidden' } });
          }
          // 增加延迟，确保 canvas DOM 完全渲染
          setTimeout(() => {
            this.generatePoster();
          }, 500);
        } else if (!newVal && oldVal) {
          // 关闭时：清理状态，防止穿透 + 恢复页面滚动
          this.setData({
            isLoading: true,
            posterImagePath: ''
          });
          // 恢复背景页面滚动
          if (wx.setPageStyle) {
            wx.setPageStyle({ style: { overflow: 'auto' } });
          }
        }
      }
    },
    title: {
      type: String,
      value: '分享投票结果'
    },
    posterData: {
      type: Object,
      value: null
    }
  },

  data: {
    isLoading: true,
    canvasWidth: 750,
    canvasHeight: 1250,
    posterImagePath: ''
  },

  methods: {
    onClose() {
      this.setData({
        isLoading: true,
        posterImagePath: ''
      }, () => {
        setTimeout(() => {
          this.triggerEvent('close');
        }, 300);
      });
    },

    onContentTap() {
      // 阻止冒泡到mask层
    },

    async generatePoster() {
      if (!this.properties.posterData) {
        return;
      }


      this.setData({ isLoading: true });

      try {
        const poster = new PosterGenerator();
        
        await poster.initCanvas('posterCanvas', this);
        
        // 统一使用结果海报绘制方法
        await poster.drawResultPoster(this.properties.posterData);

        // 延迟导出，确保所有绘制操作完成（图片异步加载需要时间）
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const imagePath = await poster.generateImage();
        
        
        this.setData({
          posterImagePath: imagePath,
          isLoading: false
        });

        this.triggerEvent('generated', { imagePath });
      } catch (err) {
        wx.showToast({
          title: '海报生成失败: ' + (err.message || '未知错误'),
          icon: 'none',
          duration: 3000
        });
        this.setData({ isLoading: false });
      }
    },

    async onSave() {
      if (!this.data.posterImagePath) {
        wx.showToast({
          title: '海报未生成',
          icon: 'none'
        });
        return;
      }

      try {
        const poster = new PosterGenerator();
        await poster.saveToAlbum(this.data.posterImagePath);
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
        this.triggerEvent('save', { imagePath: this.data.posterImagePath });
      } catch (err) {
      }
    },

    onShareFriend() {
      if (!this.data.posterImagePath) {
        wx.showToast({
          title: '海报未生成',
          icon: 'none'
        });
        return;
      }

      this.triggerEvent('shareFriend', { 
        imagePath: this.data.posterImagePath,
        posterData: this.properties.posterData
      });
    }
  }
});
