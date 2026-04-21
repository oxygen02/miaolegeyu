Page({
  data: {
    hardTaboos: [
      {name: 'spicy', label: '辣', selected: false},
      {name: 'seafood', label: '海鲜', selected: false},
      {name: 'lamb', label: '羊肉', selected: false},
      {name: 'beef', label: '牛肉', selected: false}
    ],
    softTaboos: [
      {name: 'coriander', label: '香菜', selected: false},
      {name: 'onion', label: '葱', selected: false},
      {name: 'garlic', label: '蒜', selected: false}
    ]
  },
  toggleHard(e) {
    const name = e.currentTarget.dataset.name;
    const list = this.data.hardTaboos.map(item => 
      item.name === name ? {...item, selected: !item.selected} : item
    );
    this.setData({hardTaboos: list});
  },
  toggleSoft(e) {
    const name = e.currentTarget.dataset.name;
    const list = this.data.softTaboos.map(item => 
      item.name === name ? {...item, selected: !item.selected} : item
    );
    this.setData({softTaboos: list});
  },
  submit() {
    wx.showToast({title: '提交成功', icon: 'success'});
    setTimeout(() => wx.navigateBack(), 1500);
  }
});