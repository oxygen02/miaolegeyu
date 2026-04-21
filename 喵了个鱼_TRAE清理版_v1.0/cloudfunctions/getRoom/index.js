const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, uuid } = event;
  try {
    const { data: room } = await db.collection('rooms').doc(roomId).get();
    if (!room) return { code: -1, msg: '房间不存在' };
    let participant = null;
    const { data: parts } = await db.collection('participants').where({ roomId, uuid }).get();
    if (parts.length === 0) {
      await db.collection('participants').add({ data: { roomId, uuid, status: 'opened', createdAt: db.serverDate() } });
    } else { participant = parts[0]; }
    return { code: 0, data: { room, participant, isCreator: room.creatorOpenId === wxContext.OPENID } };
  } catch(e) { return { code: -1, msg: e.message }; }
};