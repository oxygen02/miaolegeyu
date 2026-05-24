const CDN_BASE = 'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la';

const imagePaths = {
  icons: {
    about: `${CDN_BASE}/icons/about.png`,
    collection: `${CDN_BASE}/icons/collection.png`,
    customerService: `${CDN_BASE}/icons/CustomerService.png`,
    feedbacks: `${CDN_BASE}/icons/feedbacks.png`,
    feedbackManage: `${CDN_BASE}/icons/feedbackmanage.png`,
    history: `${CDN_BASE}/icons/juze_avatar.png`,
    setting: `${CDN_BASE}/icons/setting.png`,
    gexingtouxiang: `${CDN_BASE}/icons/gexingtouxiang.png`,
    hudong: `${CDN_BASE}/icons/hudong.png`,
    tuijian: `${CDN_BASE}/icons/tuijian.png`,
    toupiaojuece: `${CDN_BASE}/icons/toupiaojuece.png`,
    juzeAvatar: `${CDN_BASE}/icons/juze_avatar.png`,
    daohang: `${CDN_BASE}/icons/location.png`,
    chongxuan: `${CDN_BASE}/icons/chongxuan.png`,
    gaizhang: `${CDN_BASE}/icons/gaizhang.png`,
    dazhongdianping: `${CDN_BASE}/icons/dazhongdianping.png`,
    meituantubiao: `${CDN_BASE}/icons/meituantubiao.png`,
    sharetofriends: `${CDN_BASE}/icons/sharetofriends.png`,
    location: `${CDN_BASE}/icons/location.png`,
    danzhua: `${CDN_BASE}/icons/danzhua.png`,
    calendar: `${CDN_BASE}/icons/calendar.png`,
    clock: `${CDN_BASE}/icons/calendar.png`,
    edit: `${CDN_BASE}/icons/icon-edit.png`,
    lock: `${CDN_BASE}/icons/icon-lock.png`,
    shareW: `${CDN_BASE}/icons/icon-share-w.png`,
    mask: `${CDN_BASE}/icons/icon-mask.png`,
    copy: `${CDN_BASE}/icons/icon-copy.png`,
    chart: `${CDN_BASE}/icons/icon-chart.png`,
    members: `${CDN_BASE}/icons/icon-members.png`,
    bulb: `${CDN_BASE}/icons/icon-bulb.png`,
    trophy: `${CDN_BASE}/icons/icon-trophy.png`,
    shield: `${CDN_BASE}/icons/icon-shield.png`,
  },

  decorations: {
    catFishLogo: `${CDN_BASE}/decorations/cat-fish-logo.png`,
    loadingCat: `${CDN_BASE}/decorations/loading-cat.png`,
    catDecoration: `${CDN_BASE}/decorations/cat-decoration.png`,
    catAvatarIcon: `${CDN_BASE}/decorations/cat-avatar-icon.png`,
    happyCatIcon: `${CDN_BASE}/decorations/happy-cat-icon.png`,
    loveCatIcon: `${CDN_BASE}/decorations/love-cat-icon.png`,
    peekingCatIcon: `${CDN_BASE}/misc/juze_avatar.png`,
    sleepingCatIcon: `${CDN_BASE}/misc/juze_avatar.png`,
    winkCatIcon: `${CDN_BASE}/misc/juze_avatar.png`,
    angryCat: `${CDN_BASE}/misc/juze_avatar.png`,
    catTail: `${CDN_BASE}/decorations/cat-tail.png`,
  },

  banners: {
    faqijucan: `${CDN_BASE}/banners/faqijucan.png`,
    nimenlaiding2: `${CDN_BASE}/banners/nimenlaiding2.png`,
    yutangpindan: `${CDN_BASE}/banners/yutangpindan.png`,
    jucanfaqi1: `${CDN_BASE}/banners/jucanfaqi1.png`,
    jucanfaqi2: `${CDN_BASE}/banners/jucanfaqi2.png`,
    jucanfaqi3: `${CDN_BASE}/banners/jucanfaqi3.png`,
    taiyakiIcon: `${CDN_BASE}/banners/taiyaki-icon.png`,
    maoweiba: `${CDN_BASE}/banners/maoweiba.png`,
    daohang: `${CDN_BASE}/banners/daohang.png`,
    wotiaohaole1: `${CDN_BASE}/banners/wotiaohaole1.png`,
    lunbozhanwei: `${CDN_BASE}/banners/lunbozhanwei.png`,
    lunbozhanwei2: `${CDN_BASE}/banners/lunbozhanwei2.png`,
  },

  misc: {
    singleclaw: `${CDN_BASE}/misc/singleclaw.png`,
    wxhlfangun: `${CDN_BASE}/misc/wxhlfangun.png`,
    catPawIcon: `${CDN_BASE}/misc/cat-paw-icon.png`,
    pawHomeIcon: `${CDN_BASE}/misc/paw-home-icon.png`,
    fishIcon: `${CDN_BASE}/misc/fish-icon.png`,
    juzeAvatar: `${CDN_BASE}/misc/juze_avatar.png`,
  },

  cuisine: (categoryId, subId) => {
    return `${CDN_BASE}/misc/juze_avatar.png`;
  }
};

module.exports = {
  imagePaths,
  CDN_BASE
};