const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, uuid, vote, hardTaboos, softTaboos, timeInfo, leaveInfo, status } = event;
  try {
    const { data: parts } = await db.collection('participants').where({ roomId, uuid }).get();
    const data = { status: status || 'voted', updatedAt: db.serverDate() };
    if (vote) data.vote = vote;
    if (hardTaboos) data.hardTaboos = hardTaboos;
    if (softTaboos) data.softTaboos = softTaboos;
    if (timeInfo) data.timeInfo = timeInfo;
    if (leaveInfo) data.leaveInfo = { ...leaveInfo, realName: leaveInfo.realName || wxContext.OPENID };
    if (parts.length === 0) {
      await db.collection('participants').add({ data: { roomId, uuid, ...data, createdAt: db.serverDate() } });
    } else {
      await db.collection('participants').doc(parts[0]._id).update({ data });
    }
    return { code: 0 };
  } catch(e) { return { code: -1, msg: e.message }; }
};