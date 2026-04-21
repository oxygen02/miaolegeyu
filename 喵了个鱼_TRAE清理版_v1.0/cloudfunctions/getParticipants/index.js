const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
exports.main = async (event) => {
  const { roomId, status } = event;
  try {
    let query = db.collection('participants').where({ roomId });
    if (status) query = query.where({ status });
    const { data } = await query.get();
    return { code: 0, data };
  } catch(e) { return { code: -1, msg: e.message }; }
};