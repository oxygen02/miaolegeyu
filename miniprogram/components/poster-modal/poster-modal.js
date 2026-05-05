const PosterGenerator = require('../../utils/poster.js');

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
    canvasHeight: 960,
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
        console.error('[海报] 海报数据为空');
        return;
      }

      console.log('[海报] ========== 弹窗开始生成海报 ==========');
      console.log('[海报] posterData:', JSON.stringify(this.properties.posterData));

      this.setData({ isLoading: true });

      try {
        const poster = new PosterGenerator();
        
        console.log('[海报] 初始化画布...');
        await poster.initCanvas('posterCanvas', this);
        console.log('[海报] 画布初始化完成');
        
        // 根据类型选择绘制方法
        const { type } = this.properties.posterData;
        console.log('[海报] 海报类型:', type || '(无type，使用result)');
        
        if (type === 'share') {
          await poster.drawSharePoster(this.properties.posterData);
        } else {
          await poster.drawResultPoster(this.properties.posterData);
        }

        // 延迟导出，确保所有绘制操作完成（图片异步加载需要时间）
        console.log('[海报] 等待渲染完成...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const imagePath = await poster.generateImage();
        
        console.log('[海报] 海报生成成功! 路径:', imagePath);
        
        this.setData({
          posterImagePath: imagePath,
          isLoading: false
        });

        this.triggerEvent('generated', { imagePath });
      } catch (err) {
        console.error('[海报] 生成海报失败:', err);
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
        console.error('[海报] 保存失败:', err);
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
