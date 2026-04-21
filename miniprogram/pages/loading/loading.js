Page({
  data: {
    imageLoaded: false,
    showTitle: false,
    showLoading: false,
    progress: 0,
    loadingText: '加载中...',
    loadingTexts: ['加载中...', '准备猫粮...', '召唤橘仔...', '即将开启...']
  },

  onLoad(options) {
    // 页面加载时启动动画序列
    this.startLoadingSequence();
  },

  onReady() {
    // 页面渲染完成后
  },

  // 图片加载完成回调
  onImageLoad() {
    this.setData({ imageLoaded: true });
    
    // 图片加载后显示标题
    setTimeout(() => {
      this.setData({ showTitle: true });
    }, 300);
    
    // 显示加载进度
    setTimeout(() => {
      this.setData({ showLoading: true });
      this.simulateProgress();
    }, 600);
  },

  // 启动加载序列
  startLoadingSequence() {
    // 设置超时，如果图片加载失败也继续
    setTimeout(() => {
      if (!this.data.imageLoaded) {
        this.onImageLoad();
      }
    }, 2000);
  },

  // 模拟加载进度
  simulateProgress() {
    const targetProgress = 100;
    const duration = 2000; // 2秒加载时间
    const interval = 50; // 每50ms更新一次
    const steps = duration / interval;
    const increment = targetProgress / steps;
    
    let currentProgress = 0;
    let textIndex = 0;
    
    const progressTimer = setInterval(() => {
      currentProgress += increment;
      
      // 更新加载文字
      if (currentProgress > 25 && textIndex === 0) {
        textIndex = 1;
        this.setData({ loadingText: this.data.loadingTexts[1] });
      } else if (currentProgress > 50 && textIndex === 1) {
        textIndex = 2;
        this.setData({ loadingText: this.data.loadingTexts[2] });
      } else if (currentProgress > 75 && textIndex === 2) {
        textIndex = 3;
        this.setData({ loadingText: this.data.loadingTexts[3] });
      }
      
      if (currentProgress >= targetProgress) {
        currentProgress = targetProgress;
        clearInterval(progressTimer);
        
        // 加载完成，跳转到首页
        setTimeout(() => {
          this.navigateToHome();
        }, 300);
      }
      
      this.setData({ progress: Math.floor(currentProgress) });
    }, interval);
  },

  // 跳转到首页
  navigateToHome() {
    wx.switchTab({
      url: '/pages/index/index',
      success: () => {
        console.log('跳转首页成功');
      },
      fail: (err) => {
        console.error('跳转首页失败:', err);
        // 如果switchTab失败，尝试redirectTo
        wx.redirectTo({
          url: '/pages/index/index'
        });
      }
    });
  },

  // 点击跳过
  onSkipTap() {
    this.navigateToHome();
  }
});
