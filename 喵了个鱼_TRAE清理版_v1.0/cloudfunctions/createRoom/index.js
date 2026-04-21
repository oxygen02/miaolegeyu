const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { title, mode, platform, candidatePosters, voteDeadline, timeAuxiliary, groupOrderOption } = event;
  try {
    const { _id } = await db.collection('rooms').add({
      data: { title, mode, platform, creatorOpenId: wxContext.OPENID, status: 'voting', candidatePosters, voteDeadline: new Date(voteDeadline), timeAuxiliary, groupOrderOption, createdAt: db.serverDate() }
    });
    return { code: 0, data: { roomId: _id } };
  } catch(e) { return { code: -1, msg: e.message }; }
};