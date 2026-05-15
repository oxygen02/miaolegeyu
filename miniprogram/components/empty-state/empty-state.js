const { imagePaths } = getApp().globalData;

Component({
  properties: {
    type: {
      type: String,
      value: 'default' // default, search, network, error
    },
    icon: {
      type: String,
      value: ''
    },
    title: {
      type: String,
      value: ''
    },
    desc: {
      type: String,
      value: ''
    },
    btnText: {
      type: String,
      value: ''
    }
  },

  data: {
    defaultIcon: ''
  },

  lifetimes: {
    attached() {
      const icons = {
        default: imagePaths.decorations.catAvatarIcon,
        search: imagePaths.decorations.catAvatarIcon,
        network: imagePaths.decorations.catAvatarIcon,
        error: imagePaths.decorations.catAvatarIcon
      };
      this.setData({ defaultIcon: icons[this.data.type] || icons.default });
    }
  },

  methods: {
    onBtnTap() {
      this.triggerEvent('btnTap');
    }
  }
});