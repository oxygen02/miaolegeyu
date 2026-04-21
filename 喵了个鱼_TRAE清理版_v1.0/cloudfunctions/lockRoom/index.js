const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, winnerIndex, address, time } = event;
  try {
    const { data: room } = await db.collection('rooms').doc(roomId).get();
    if (!room) return { code: -1, msg: '房间不存在' };
    if (room.creatorOpenId !== wxContext.OPENID) return { code: -1, msg: '无权限' };
    const poster = room.candidatePosters[winnerIndex];
    if (!poster) return { code: -1, msg: '无效选择' };
    await db.collection('rooms').doc(roomId).update({
      data: { status: 'locked', finalPoster: { imageUrl: poster.imageUrl, platformSource: poster.platformSource, time: time ? new Date(time) : db.serverDate(), address: address || '' }, lockedAt: db.serverDate() }
    });
    return { code: 0 };
  } catch(e) { return { code: -1, msg: e.message }; }
};