const APP_IDS = {
  meituan: 'wxde8ac0a21135c07d',
  dianping: 'wxc0d6fdfa1c166f6c',
  jd: 'wx91d27dbf599dff74'
};
function goToPlatform(platform) {
  const id = APP_IDS[platform];
  if (!id) return wx.showToast({ title: '未知平台', icon: 'none' });
  wx.navigateToMiniProgram({ appId: id, path: 'pages/index/index', fail: () => wx.showToast({ title: '跳转失败', icon: 'none' }) });
}
module.exports = { goToPlatform };
