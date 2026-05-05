const { imagePaths } = require('../config/imageConfig');

// 自定义底部导航栏
Component({
  data: {
    selected: 0,
    imagePaths: imagePaths,
    list: [
      { pagePath: '/pages/index/index', text: '首页' },
      { pagePath: '/pages/fish-tank/fish-tank', text: '喵不喵' },
      { pagePath: '/pages/profile/profile', text: '我的' }
    ]
  },

  lifetimes: {
    attached() {
      // 延迟设置选中状态，避免阻塞渲染
      setTimeout(() => {
        this.updateSelectedFromPage();
      }, 0);
    }
  },

  methods: {
    // 根据当前页面路径更新选中状态
    updateSelectedFromPage() {
      const pages = getCurrentPages();
      if (pages.length === 0) return;

      const currentPath = pages[pages.length - 1].route || '';

      let selectedIndex = 0;
      if (currentPath.includes('fish-tank')) {
        selectedIndex = 1;
      } else if (currentPath.includes('profile')) {
        selectedIndex = 2;
      }

      this.setData({ selected: selectedIndex });
    },

    switchTab(e) {
      const index = parseInt(e.currentTarget.dataset.index);

      // 如果已经是当前选中，不处理
      if (this.data.selected === index) {
        return;
      }

      const url = this.data.list[index].pagePath;

      console.log('Switching to:', url);

      // 先跳转页面，再更新状态
      wx.switchTab({
        url,
        success: () => {
          // 跳转成功后再更新选中状态
          this.setData({ selected: index });
        },
        fail: (err) => {
          console.error('switchTab fail:', err);
        }
      });
    }
  }
});