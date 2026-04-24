const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { limit = 20, mode = '' } = event;
  
  try {
    let whereClause = {
      status: 'voting' // 只显示进行中的活动
    };
    
    // 根据模式筛选
    if (mode === 'group') {
      whereClause.mode = 'group';
    } else if (mode === 'dining') {
      whereClause.mode = _.in(['a', 'b']);
    }

    // 获取所有进行中的房间
    const { data: rooms } = await db.collection('rooms')
      .where(whereClause)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (!rooms || rooms.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }

    // 获取所有房间ID
    const roomIds = rooms.map(room => room.roomId);
    
    // 批量获取参与者数量
    let participantCounts = {};
    try {
      const { data: participants } = await db.collection('room_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true })
        .get();
      
      // 统计每个房间的参与者数量
      participants.forEach(p => {
        participantCounts[p.roomId] = (participantCounts[p.roomId] || 0) + 1;
      });
    } catch (err) {
      console.error('获取参与者数量失败:', err);
    }

    // 组装返回数据
    const roomsWithParticipants = rooms.map(room => ({
      _id: room._id,
      roomId: room.roomId,
      title: room.title,
      status: room.status,
      mode: room.mode,
      activityDate: room.activityDate,
      activityTime: room.activityTime,
      location: room.location,
      shopName: room.shopName,
      shopImage: room.shopImage,
      platform: room.platform,
      minAmount: room.minAmount,
      deadline: room.deadline,
      createdAt: room.createdAt,
      voteDeadline: room.voteDeadline,
      finalPoster: room.finalPoster,
      candidatePosters: room.candidatePosters || [],
      participantCount: participantCounts[room.roomId] || 0
    }));

    return {
      success: true,
      rooms: roomsWithParticipants
    };
  } catch (err) {
    console.error('getAllRooms error:', err);
    return {
      success: false,
      error: err.message,
      rooms: []
    };
  }
};
