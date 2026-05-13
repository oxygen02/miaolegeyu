// 图片云存储配置
// 使用 CDN 直链（腾讯云存储的公开访问域名）
// 格式: https://<env-id>-<appid>.tcb.qcloud.la/<path>
const CDN_BASE = 'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la';

// 图片路径映射（直接使用 HTTPS CDN URL）
const imagePaths = {
  // 图标
  icons: {
    about: `${CDN_BASE}/icons/about.png`,
    history: `${CDN_BASE}/icons/history.png`,
    setting: `${CDN_BASE}/icons/setting.png`,
    gexingtouxiang: `${CDN_BASE}/icons/gexingtouxiang.png`,
    hudong: `${CDN_BASE}/icons/hudong.png`,
    tuijian: `${CDN_BASE}/icons/tuijian.png`,
    toupiaojuece: `${CDN_BASE}/icons/toupiaojuece.png`,
    juzeAvatar: `${CDN_BASE}/icons/juze_avatar.png`,
    daohang: `${CDN_BASE}/icons/daohang.png`,
    chongxuan: `${CDN_BASE}/icons/chongxuan.png`,
    gaizhang: `${CDN_BASE}/icons/gaizhang.png`,
    dazhongdianping: `${CDN_BASE}/icons/dazhongdianping.png`,
    meituantubiao: `${CDN_BASE}/icons/meituantubiao.png`,
    sharetofriends: `${CDN_BASE}/icons/sharetofriends.png`,
    location: `${CDN_BASE}/icons/location.png`,
    calendar: `${CDN_BASE}/icons/history.png`, // 日历图标（复用 history 图标）
  },

  // 装饰图
  decorations: {
    catFishLogo: `${CDN_BASE}/decorations/cat-fish-logo.png`,
    loadingCat: `${CDN_BASE}/decorations/loading-cat.png`,
    catDecoration: `${CDN_BASE}/decorations/cat-decoration.png`,
    catAvatarIcon: `${CDN_BASE}/decorations/cat-avatar-icon.png`,
    happyCatIcon: `${CDN_BASE}/decorations/happy-cat-icon.png`,
    loveCatIcon: `${CDN_BASE}/decorations/love-cat-icon.png`,
    peekingCatIcon: `${CDN_BASE}/decorations/peeking-cat-icon.png`,
    sleepingCatIcon: `${CDN_BASE}/decorations/sleeping-cat-icon.png`,
    winkCatIcon: `${CDN_BASE}/decorations/wink-cat-icon.png`,
    angryCat: `${CDN_BASE}/decorations/angry-cat.png`,
  },

  // 横幅/背景
  banners: {
    faqijucan: `${CDN_BASE}/banners/faqijucan.png`,
    nimenlaiding2: `${CDN_BASE}/banners/nimenlaiding2.png`,
    yutangpindan: `${CDN_BASE}/banners/yutangpindan.png`,
    jucanfaqi1: `${CDN_BASE}/banners/jucanfaqi1.png`,     // 聚餐发起-约个时间
    jucanfaqi2: `${CDN_BASE}/banners/jucanfaqi2.png`,     // 聚餐发起-我选好了
    jucanfaqi3: `${CDN_BASE}/banners/jucanfaqi3.png`,     // 聚餐发起-你们来定
    taiyakiIcon: `${CDN_BASE}/banners/taiyaki-icon.png`,
    maoweiba: `${CDN_BASE}/banners/maoweiba.png`,
    daohang: `${CDN_BASE}/banners/daohang.png`,
    wotiaohaole1: `${CDN_BASE}/banners/wotiaohaole1.png`,
    lunbozhanwei: `${CDN_BASE}/banners/lunbozhanwei.png`,
    lunbozhanwei2: `${CDN_BASE}/banners/lunbozhanwei2.png`,
  },

  // 其他
  misc: {
    singleclaw: `${CDN_BASE}/misc/singleclaw.png`,
    wxhlfangun: `${CDN_BASE}/misc/wxhlfangun.png`,
    catPawIcon: `${CDN_BASE}/misc/cat-paw-icon.png`,
    pawHomeIcon: `${CDN_BASE}/misc/paw-home-icon.png`,
    fishIcon: `${CDN_BASE}/misc/fish-icon.png`,
    juzeAvatar: `${CDN_BASE}/misc/juze_avatar.png`,
  },

  // 菜品/菜系（已配置）
  cuisine: (categoryId, subId) => {
    return `${CDN_BASE}/cuisine-images/category_${categoryId}_${subId}.png`;
  }
};

module.exports = {
  imagePaths,
  CDN_BASE
};
