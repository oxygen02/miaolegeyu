const PosterGenerator = require('../../utils/poster.js');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          this.generatePoster();
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
    canvasWidth: 300,
    canvasHeight: 480,
    posterImagePath: ''
  },

  methods: {
    onClose() {
      this.triggerEvent('close');
    },

    onContentTap() {
      // 阻止冒泡
    },

    async generatePoster() {
      if (!this.properties.posterData) {
        console.error('海报数据为空');
        return;
      }

      this.setData({ isLoading: true });

      try {
        const poster = new PosterGenerator();
        await poster.initCanvas('posterCanvas', this);
        
        // 根据类型选择绘制方法
        const { type } = this.properties.posterData;
        if (type === 'share') {
          await poster.drawSharePoster(this.properties.posterData);
        } else {
          await poster.drawResultPoster(this.properties.posterData);
        }
        
        const imagePath = await poster.generateImage();
        
        this.setData({
          posterImagePath: imagePath,
          isLoading: false
        });

        // 触发海报生成成功事件
        this.triggerEvent('generated', { imagePath });
      } catch (err) {
        console.error('生成海报失败:', err);
        wx.showToast({
          title: '海报生成失败',
          icon: 'none'
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
        console.error('保存失败:', err);
      }
    },

    onShare() {
      if (!this.data.posterImagePath) {
        wx.showToast({
          title: '海报未生成',
          icon: 'none'
        });
        return;
      }

      this.triggerEvent('share', { 
        imagePath: this.data.posterImagePath,
        posterData: this.properties.posterData
      });
    }
  }
});
