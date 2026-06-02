Component({
  properties: {
    type: {
      type: String,
      value: 'default'
    },
    title: {
      type: String,
      value: ''
    },
    description: {
      type: String,
      value: ''
    },
    buttonText: {
      type: String,
      value: ''
    },
    imageUrl: {
      type: String,
      value: ''
    },
    showButton: {
      type: Boolean,
      value: true
    }
  },

  data: {
    defaultConfigs: {
      default: {
        title: '暂无数据',
        description: '暂无相关内容',
        buttonText: '去看看',
        icon: 'empty'
      },
      room: {
        title: '还没有房间',
        description: '快去创建一个聚餐房间吧',
        buttonText: '创建房间',
        icon: 'room'
      },
      vote: {
        title: '还没有投票',
        description: '参与投票，选出心仪的餐厅',
        buttonText: '去投票',
        icon: 'vote'
      },
      shop: {
        title: '暂无店铺',
        description: '快来推荐你喜欢的餐厅',
        buttonText: '推荐店铺',
        icon: 'shop'
      },
      order: {
        title: '暂无订单',
        description: '还没有参与任何聚会活动',
        buttonText: '发起聚会',
        icon: 'order'
      },
      message: {
        title: '暂无消息',
        description: '暂时没有新消息',
        buttonText: '',
        icon: 'message'
      },
      search: {
        title: '未找到结果',
        description: '换个关键词试试吧',
        buttonText: '',
        icon: 'search'
      },
      network: {
        title: '网络连接失败',
        description: '请检查网络设置',
        buttonText: '重新连接',
        icon: 'network'
      }
    },
    iconPaths: {}
  },

  async attached() {
    const app = getApp();
    const imagePaths = await app.whenImageReady();
    this.setData({ iconPaths: imagePaths });
  },

  methods: {
    getConfig() {
      const { type, title, description, buttonText, imageUrl } = this.properties;
      const defaultConfig = this.data.defaultConfigs[type] || this.data.defaultConfigs.default;
      
      return {
        title: title || defaultConfig.title,
        description: description || defaultConfig.description,
        buttonText: buttonText || defaultConfig.buttonText,
        icon: defaultConfig.icon,
        imageUrl: imageUrl
      };
    },

    onButtonTap() {
      this.triggerEvent('buttonTap', {});
    }
  }
});