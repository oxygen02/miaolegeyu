const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { limit = 10 } = event;
  
  try {
    // 获取用户参与过的房间（使用 room_participants 集合）
    const participantResult = await db.collection('room_participants')
      .where({ openid: wxContext.OPENID })
      .orderBy('joinedAt', 'desc')
      .limit(limit)
      .get();
    
    const roomIds = participantResult.data.map(p => p.roomId);
    
    if (roomIds.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }
    
    // 获取房间详情（使用 roomId 字段查询）
    const roomResult = await db.collection('rooms')
      .where({
        roomId: _.in(roomIds)
      })
      .get();
    
    // 按参与时间排序
    const roomMap = {};
    roomResult.data.forEach(room => {
      roomMap[room.roomId] = room;
    });
    
    const rooms = roomIds.map(id => {
      const room = roomMap[id];
      if (!room) return null;
      return {
        _id: room._id,
        roomId: room.roomId,
        title: room.title,
        status: room.status,
        mode: room.mode,
        candidatePosters: room.candidatePosters || [],
        createdAt: room.createdAt,
        location: room.location,
        activityTime: room.activityTime,
        participantCount: room.participantCount || 0
      };
    }).filter(Boolean);
    
    return {
      success: true,
      rooms
    };
  } catch (err) {
    console.error('getRecentRooms error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
