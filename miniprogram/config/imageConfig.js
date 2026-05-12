// 图片云存储配置
// 使用 HTTPS 临时链接，避免 cloud:// 协议问题
const BASE_URL = 'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la';

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
    calendar: `${BASE_URL}/icons/calendar.png`,
    time: `${BASE_URL}/icons/time.png`,
    deadline: `${BASE_URL}/icons/deadline.png`,
    roomnum: `${BASE_URL}/icons/roomnum.png`,
    hint: `${BASE_URL}/icons/hint.png`,
    restaurant: `${BASE_URL}/icons/restaurant.png`,
    star: `${BASE_URL}/icons/star.png`,
    close: `${BASE_URL}/icons/close.png`,
    phone: `${BASE_URL}/icons/phone.png`,
    check: `${BASE_URL}/icons/check.png`,
    target: `${BASE_URL}/icons/target.png`,
    forbidden: `${BASE_URL}/icons/forbidden.png`,
    refresh: `${BASE_URL}/icons/refresh.png`,
    search: `${BASE_URL}/icons/search.png`,
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
    jucanfaqi1: `${BASE_URL}/banners/jucanfaqi1.png`,
    jucanfaqi2: `${BASE_URL}/banners/jucanfaqi2.png`,
    jucanfaqi3: `${BASE_URL}/banners/jucanfaqi3.png`,
    yutangpindan: `${BASE_URL}/banners/yutangpindan.png`,
    taiyakiIcon: `${BASE_URL}/banners/taiyaki-icon.png`,
    maoweiba: `${BASE_URL}/banners/maoweiba.png`,
    daohang: `${BASE_URL}/banners/daohang.png`,
    wotiaohaole1: `${BASE_URL}/banners/wotiaohaole1.png`,
    lunbozhanwei: `${BASE_URL}/banners/lunbozhanwei.png`,
    lunbozhanwei2: `${BASE_URL}/banners/lunbozhanwei2.png`,
    posterBg: `${BASE_URL}/banners/poster-bg.png`,
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
  
  // 菜品/菜系
  cuisine: (categoryId, subId) => {
    return `${BASE_URL}/cuisine-images/category_${categoryId}_${subId}.png`;
  }
};

module.exports = {
  imagePaths,
  BASE_URL
};
