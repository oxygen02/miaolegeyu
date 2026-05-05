// 图片云存储配置
const CLOUD_ENV = 'cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909';
const BASE_URL = `cloud://${CLOUD_ENV}`;

// 图片路径映射
const imagePaths = {
  // 图标
  icons: {
    about: `${BASE_URL}/icons/about.png`,
    setting: `${BASE_URL}/icons/setting.png`,
    gexingtouxiang: `${BASE_URL}/icons/gexingtouxiang.png`,
    hudong: `${BASE_URL}/icons/hudong.png`,
    tuijian: `${BASE_URL}/icons/tuijian.png`,
    toupiaojuece: `${BASE_URL}/icons/toupiaojuece.png`,
    juzeAvatar: `${BASE_URL}/icons/juze_avatar.png`,
    daohang: `${BASE_URL}/icons/daohang.png`,
    chongxuan: `${BASE_URL}/icons/chongxuan.png`,
    gaizhang: `${BASE_URL}/icons/gaizhang.png`,
    dazhongdianping: `${BASE_URL}/icons/dazhongdianping.png`,
    meituantubiao: `${BASE_URL}/icons/meituantubiao.png`,
    sharetofriends: `${BASE_URL}/icons/sharetofriends.png`,
    location: `${BASE_URL}/icons/location.png`,
    favorite: `${BASE_URL}/icons/favorite.png`,
    // 个人中心页面需要的图标（需要上传到云存储）
    calendar: `${BASE_URL}/icons/calendar.png`,      // 日历图标 - 缺失
    time: `${BASE_URL}/icons/time.png`,              // 时间图标 - 缺失  
    deadline: `${BASE_URL}/icons/deadline.png`,      // 截止/时钟图标 - 缺失
    roomnum: `${BASE_URL}/icons/roomnum.png`,          // 房间号图标
    // test-recommend 页面图标
    hint: `${BASE_URL}/icons/hint.png`,              // 提示灯泡
    restaurant: `${BASE_URL}/icons/restaurant.png`,  // 餐厅/餐具
    star: `${BASE_URL}/icons/star.png`,              // 评分星星
    close: `${BASE_URL}/icons/close.png`,            // 关闭按钮
    phone: `${BASE_URL}/icons/phone.png`,            // 电话
    check: `${BASE_URL}/icons/check.png`,            // 选中/对勾
    target: `${BASE_URL}/icons/target.png`,           // 目标/靶心 🎯
    forbidden: `${BASE_URL}/icons/forbidden.png`,     // 禁止 🚫
    refresh: `${BASE_URL}/icons/refresh.png`,         // 刷新 🔄
    search: `${BASE_URL}/icons/search.png`,           // 搜索🔍
  },
  
  // 装饰图
  decorations: {
    catFishLogo: `${BASE_URL}/decorations/cat-fish-logo.png`,
    loadingCat: `${BASE_URL}/decorations/loading-cat.png`,
    catDecoration: `${BASE_URL}/decorations/cat-decoration.png`,
    catAvatarIcon: `${BASE_URL}/decorations/cat-avatar-icon.png`,
    happyCatIcon: `${BASE_URL}/decorations/happy-cat-icon.png`,
    loveCatIcon: `${BASE_URL}/decorations/love-cat-icon.png`,
    peekingCatIcon: `${BASE_URL}/decorations/peeking-cat-icon.png`,
    sleepingCatIcon: `${BASE_URL}/decorations/sleeping-cat-icon.png`,
    winkCatIcon: `${BASE_URL}/decorations/wink-cat-icon.png`,
    angryCat: `${BASE_URL}/decorations/angry-cat.png`,
  },
  
  // 横幅/背景
  banners: {
    faqijucan: `${BASE_URL}/banners/faqijucan.png`,
    nimenlaiding2: `${BASE_URL}/banners/nimenlaiding2.png`,
    yutangpindan: `${BASE_URL}/banners/yutangpindan.png`,
    taiyakiIcon: `${BASE_URL}/banners/taiyaki-icon.png`,
    maoweiba: `${BASE_URL}/banners/maoweiba.png`,
    daohang: `${BASE_URL}/banners/daohang.png`,
    wotiaohaole1: `${BASE_URL}/banners/wotiaohaole1.png`,
    lunbozhanwei: `${BASE_URL}/banners/lunbozhanwei.png`,
    lunbozhanwei2: `${BASE_URL}/banners/lunbozhanwei2.png`,
    posterBg: `${BASE_URL}/banners/poster-bg.png`, // 海报背景图
  },
  
  // 其他
  misc: {
    singleclaw: `${BASE_URL}/misc/singleclaw.png`,
    wxhlfangun: `${BASE_URL}/misc/wxhlfangun.png`,
    catPawIcon: `${BASE_URL}/misc/cat-paw-icon.png`,
    pawHomeIcon: `${BASE_URL}/misc/paw-home-icon.png`,
    fishIcon: `${BASE_URL}/misc/fish-icon.png`,
    juzeAvatar: `${BASE_URL}/misc/juze_avatar.png`,
  },
  
  // 菜品/菜系（已配置）
  cuisine: (categoryId, subId) => {
    return `${BASE_URL}/cuisine-images/category_${categoryId}_${subId}.png`;
  }
};

module.exports = {
  imagePaths,
  CLOUD_ENV,
  BASE_URL
};
