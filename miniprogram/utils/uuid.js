// UUID 生成与管理 - 匿名核心

/**
 * 获取或生成用户 UUID
 * 本地存储，不获取微信信息，保证匿名性
 */
function getUUID() {
  let uuid = wx.getStorageSync('miaolegeyu_uuid');
  if (!uuid) {
    // 生成 16 位随机字符串
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    uuid = result;
    wx.setStorageSync('miaolegeyu_uuid', uuid);
  }
  return uuid;
}

/**
 * 获取用户唯一标识（用于数据库）
 */
function getUserId() {
  return getUUID();
}

/**
 * 生成房间号（6位数字）
 */
function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  getUUID,
  getUserId,
  generateRoomId
};
