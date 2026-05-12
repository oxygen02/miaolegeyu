const { imagePaths, BASE_URL } = require('../../config/imageConfig');

// 云存储头像基础URL（使用HTTPS地址）
const AVATAR_BASE_URL = `${BASE_URL}/avatars/cat`;

// 默认头像列表（作为回退）
const DEFAULT_AVATARS = [
  { name: '小猫', imageUrl: imagePaths.decorations.catAvatarIcon, category: 'cat' },
  { name: '开心猫', imageUrl: imagePaths.decorations.happyCatIcon, category: 'cat' },
  { name: '爱心猫', imageUrl: imagePaths.decorations.loveCatIcon, category: 'cat' },
  { name: '偷看猫', imageUrl: imagePaths.decorations.peekingCatIcon, category: 'cat' },
  { name: '睡觉猫', imageUrl: imagePaths.decorations.sleepingCatIcon, category: 'cat' },
  { name: '眨眼猫', imageUrl: imagePaths.decorations.winkCatIcon, category: 'cat' },
  { name: '生气猫', imageUrl: imagePaths.decorations.angryCat, category: 'cat' },
  { name: '加载猫', imageUrl: imagePaths.decorations.loadingCat, category: 'cat' },
];

// 云存储头像文件名列表
const AVATAR_FILES = [
  '01_纯白蓬松.png', '01_纯白飘逸.png', '01_纯白甜美.png', '01_纯黑纤细.png',
  '01_纯蓝软糯.png', '01_梵花清爽.png', '01_粉白娇嫩.png', '01_海豹双色.png',
  '01_海豹重点色.png', '01_黑白机灵.png', '01_黑白精灵.png', '01_红棕古铜.png',
  '01_红棕长毛.png', '01_金豹纹亮眼.png', '01_金棕豹纹.png', '01_橘白蓬松.png',
  '01_橘白软糯.png', '01_蓝灰温顺.png', '01_蓝灰羊毛卷.png', '01_蓝双温柔.png',
  '01_乳白可爱.png', '01_乳白圆润.png', '01_乳黄卷毛.png', '01_三花吉祥.png',
  '01_象牙白细腻.png', '01_银白闪亮.png', '01_银灰虎斑.png', '01_棕虎斑霸气.png',
  '01_棕虎斑野性.png', '02_纯白软卷.png', '02_纯白圣洁.png', '02_海豹双色.png',
  '02_黑白灵动.png', '02_红虎斑饱满.png', '02_虎斑华丽.png', '02_虎斑俏皮.png',
  '02_黄金暖绒.png', '02_灰褐小巧.png', '02_灰蓝冷感.png', '02_焦糖渐层.png',
  '02_蓝白温柔.png', '02_蓝灰卷绒.png', '02_蓝灰雾感.png', '02_蓝灰修长.png',
  '02_蓝灰优雅.png', '02_蓝双温柔.png', '02_狸花矫健.png', '02_巧克力暖棕.png',
  '02_乳白渐变.png', '02_乳白软萌.png', '02_乳白软绒.png', '02_银虎斑华丽.png',
  '02_银灰豹斑.png', '02_银灰高冷.png', '02_银灰冷峻.png', '02_银灰冷艳.png',
  '02_银灰飘逸.png', '02_银灰丝滑.png', '03_纯白柔滑.png', '03_纯白威严.png',
  '03_纯白仙气.png', '03_纯白优雅.png', '03_纯黑霸气.png', '03_黑白呆萌.png',
  '03_黑白分明.png', '03_黑白憨厚.png', '03_黑白威严.png', '03_黑亮优雅.png',
  '03_黑色哑光.png', '03_虎斑华丽.png', '03_虎斑活泼.png', '03_虎斑机灵.png',
  '03_虎斑可爱.png', '03_虎斑灵动.png', '03_虎斑蓬卷.png', '03_虎斑俏皮.png',
  '03_蓝灰冷调.png', '03_蓝灰丝滑.png', '03_蓝金渐变.png', '03_暖棕精致.png',
  '03_浅黄淡雅.png', '03_三花精致.png', '03_山猫飘逸.png', '03_山猫纹飘逸.png',
  '03_小鹿色暖.png', '03_雪色清冷.png', '03_棕斑复古.png', '04_纯白乖巧 2.png',
  '04_纯白乖巧.png', '04_纯白仙气.png', '04_纯黑厚重.png', '04_纯黑亮泽.png',
  '04_丁香淡紫.png', '04_黑白憨厚.png', '04_黑金低调.png', '04_黑炭酷炫.png',
  '04_黑棕厚重.png', '04_红橙亮眼.png', '04_虎斑圆润.png', '04_花斑独特.png',
  '04_灰蓝柔和.png', '04_蓝白清新.png', '04_蓝灰呆萌.png', '04_蓝灰高级.png',
  '04_蓝灰浓密.png', '04_蓝灰清冷.png', '04_蓝灰软糯.png', '04_蓝灰温柔.png',
  '04_蓝灰雾卷.png', '04_乳黄柔和.png', '04_三花典雅.png', '04_三花活泼.png',
  '04_银灰迷你.png', '04_赭石复古.png', '04_紫灰浅淡 2.png', '04_紫灰浅淡.png',
  '05_纯白干净.png', '05_纯白轻盈.png', '05_玳瑁斑驳.png', '05_玳瑁杂卷.png',
  '05_黑白呆萌.png', '05_红橙暖卷.png', '05_红褐浓郁.png', '05_红虎斑灵动.png',
  '05_红棕点缀.png', '05_红棕狂野.png', '05_火焰暖橙.png', '05_焦糖复古.png',
  '05_焦糖酷炫.png', '05_橘黄讨喜 2.png', '05_橘黄讨喜.png', '05_蓝灰雾面.png',
  '05_米色温润.png', '05_奶牛呆萌.png', '05_奶油浅金.png', '05_奶油柔和.png',
  '05_暖橙饱满.png', '05_浅黄软嫩.png', '05_乳黄软萌.png', '05_三花典雅.png',
  '05_三色复古.png', '05_烟黑神秘.png', '05_烟灰色冷.png', '05_银点透亮.png',
  '05_银灰高级.png', '06_白手套纯净 2.png', '06_白手套纯净.png', '06_纯白蓬松.png',
  '06_玳瑁个性.png', '06_玳瑁小巧.png', '06_玳瑁杂卷.png', '06_海豹深色 2.png',
  '06_海豹深色.png', '06_黑金厚重.png', '06_黑金简洁.png', '06_红棕虎纹.png',
  '06_虎斑干练.png', '06_渐层精致.png', '06_焦糖温润.png', '06_金吉拉亮金.png',
  '06_净梵清爽 2.png', '06_净梵清爽.png', '06_蓝灰沉静.png', '06_蓝灰沉稳.png',
  '06_蓝灰温顺.png', '06_木炭深邃 2.png', '06_木炭深邃.png', '06_奶油柔和.png',
  '06_浅杏温柔.png', '06_三花灵动.png', '06_深棕厚重.png', '06_深棕质感.png',
  '06_烟黑神秘.png', '06_银点透亮.png'
];

Page({
  data: {
    avatars: [],
    currentCategory: '',
    keyword: '',
    selectedAvatar: '',
    selectedAvatarUrl: '',
    loading: false,
    isLoginMode: false,
    nickName: '',
    showNickNameInput: false
  },

  onLoad(options) {
    const isLoginMode = options?.mode === 'login';
    this.setData({
      isLoginMode,
      showNickNameInput: isLoginMode
    });

    this.loadAvatars();
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const avatars = this.data.avatars;
    if (avatars[index]) {
      avatars[index].imageUrl = imagePaths.decorations.catAvatarIcon;
      this.setData({ avatars });
    }
  },

  loadAvatars() {
    this.setData({ loading: true });

    try {
      const avatars = AVATAR_FILES.map((fileName, index) => {
        const name = fileName.replace(/\.[^/.]+$/, '').replace(/^\d{2}_/, '');
        const imageUrl = `${AVATAR_BASE_URL}/${fileName}`;

        return {
          _id: `avatar_cat_${index}`,
          name: name || `头像${index + 1}`,
          imageUrl: imageUrl,
          category: 'cat',
          usageCount: 0
        };
      });

      this.setData({
        avatars: avatars,
        loading: false
      });
    } catch (err) {
      this.setData({
        avatars: DEFAULT_AVATARS,
        loading: false
      });
    }
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ currentCategory: category });
    this.filterAvatars();
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.filterAvatars();
  },

  filterAvatars() {
    let filtered = AVATAR_FILES.map((fileName, index) => {
      const name = fileName.replace(/\.[^/.]+$/, '').replace(/^\d{2}_/, '');
      const imageUrl = `${AVATAR_BASE_URL}/${fileName}`;
      return {
        _id: `avatar_cat_${index}`,
        name: name || `头像${index + 1}`,
        imageUrl: imageUrl,
        category: 'cat',
        usageCount: 0
      };
    });

    if (this.data.keyword && this.data.keyword.trim()) {
      const kw = this.data.keyword.trim().toLowerCase();
      filtered = filtered.filter(item =>
        item.name && item.name.toLowerCase().includes(kw)
      );
    }

    this.setData({ avatars: filtered });
  },

  selectAvatar(e) {
    const { id, url } = e.currentTarget.dataset;
    this.setData({
      selectedAvatar: id,
      selectedAvatarUrl: url
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  async confirmSelect() {
    if (!this.data.selectedAvatar) {
      wx.showToast({ title: '请先选择头像', icon: 'none' });
      return;
    }

    if (this.data.isLoginMode) {
      if (!this.data.nickName.trim()) {
        wx.showToast({ title: '请输入昵称', icon: 'none' });
        return;
      }
      await this.doLogin();
      return;
    }

    await this.saveAvatar();
  },

  async doLogin() {
    wx.showLoading({ title: '登录中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'userLogin',
        data: {
          nickName: this.data.nickName.trim(),
          avatarUrl: this.data.selectedAvatarUrl,
          isCustom: true
        }
      });

      wx.hideLoading();
      if (result.code === 0) {
        const userData = { ...result.data, isLogin: true };
        const auth = require('../../utils/auth');
        auth.setUserInfo(userData);

        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage && prevPage.setData) {
            prevPage.setData({ userInfo: userData });
            if (prevPage.loadStats) prevPage.loadStats();
          }
        }, 1000);
      } else {
        wx.showToast({ title: result.msg || '登录失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  },

  async saveAvatar() {
    wx.showLoading({ title: '保存中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'updateUserInfo',
        data: { avatarUrl: this.data.selectedAvatarUrl }
      });

      if (result.code !== 0) throw new Error(result.msg || '更新失败');

      const auth = require('../../utils/auth');
      const userInfo = auth.getUserInfo() || {};
      userInfo.avatarUrl = this.data.selectedAvatarUrl;
      auth.setUserInfo(userInfo);

      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage) {
        prevPage.setData({ 'userInfo.avatarUrl': this.data.selectedAvatarUrl });
        if (prevPage.route === 'pages/profile/profile' && prevPage.data.currentList === 'myRooms') {
          prevPage.loadMyRooms();
        }
      }

      wx.hideLoading();
      wx.showToast({ title: '选择成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      wx.hideLoading();
      console.error('保存头像失败:', err);
      wx.showToast({ 
        title: err.message || '保存失败', 
        icon: 'none',
        duration: 3000
      });
    }
  }
});
