function getUUID() {
  let uuid = wx.getStorageSync('mlg_uuid');
  if (!uuid) {
    const arr = new Uint8Array(8);
    wx.getRandomValues(arr);
    uuid = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    wx.setStorageSync('mlg_uuid', uuid);
  }
  return uuid;
}
module.exports = { getUUID };
