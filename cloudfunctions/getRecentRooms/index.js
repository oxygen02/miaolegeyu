const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  // 限制最大返回数量，防止数据过大
  const limit = Math.min(parseInt(event.limit) || 10, 100);
  const { mode = '' } = event;
  
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
    
    // 构建房间查询条件
    let roomWhereClause = {
      roomId: _.in(roomIds)
    };
    
    // 根据模式筛选
    if (mode === 'group') {
      roomWhereClause.mode = 'group';
    } else if (mode === 'dining') {
      roomWhereClause.mode = 'pick_for_them';
    } else if (mode === 'meal') {
      roomWhereClause.mode = 'meal';
    }
    
    // 获取房间详情（使用 roomId 字段查询）
    const roomResult = await db.collection('rooms')
      .where(roomWhereClause)
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
