const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
const _ = db.command;
exports.main = async (event) => {
  try {
    const { data } = await db.collection('rooms').where({ status: _.in(['voting', 'locked']) }).orderBy('createdAt', 'desc').limit(10).get();
    return { code: 0, data: data.map(r => ({ _id: r._id, title: r.title, status: r.status, statusText: { voting: '投票中', locked: '已确定' }[r.status], posterUrl: r.finalPoster?.imageUrl || r.candidatePosters?.[0]?.imageUrl })) };
  } catch(e) { return { code: -1, msg: e.message }; }
};