const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { limit = 10 } = event;
  
  try {
    // 获取用户参与过的房间
    const participantResult = await db.collection('participants')
      .where({ openid: wxContext.OPENID })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const roomIds = participantResult.data.map(p => p.roomId);
    
    if (roomIds.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }
    
    // 获取房间详情
    const roomResult = await db.collection('rooms')
      .where({
        _id: db.command.in(roomIds)
      })
      .orderBy('createdAt', 'desc')
      .get();
    
    const rooms = roomResult.data.map(room => ({
      _id: room._id,
      title: room.title,
      status: room.status,
      mode: room.mode,
      candidatePosters: room.candidatePosters || [],
      createdAt: room.createdAt
    }));
    
    return {
      success: true,
      rooms
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
};
