const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { status = 'all', mode = '' } = event;

  try {
    let whereClause = {
      creatorOpenId: wxContext.OPENID
    };
    
    // 根据状态筛选
    if (status === 'voting') {
      whereClause.status = 'voting';
    } else if (status === 'locked') {
      whereClause.status = 'locked';
    }
    
    // 根据模式筛选（group=拼单, dining=聚餐投票）
    if (mode === 'group') {
      whereClause.mode = 'group';
    } else if (mode === 'dining') {
      whereClause.mode = _.in(['a', 'b']);
    }

    let query = db.collection('rooms').where(whereClause);

    // 获取当前用户创建的所有房间（限制数量避免超时）
    const { data: rooms } = await query.orderBy('createdAt', 'desc').limit(20).get();

    if (!rooms || rooms.length === 0) {
      return {
        code: 0,
        data: [],
        msg: '获取成功'
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
      code: 0,
      data: roomsWithParticipants,
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getMyRooms error:', err);
    return {
      code: -1,
      msg: err.message || '获取失败',
      data: []
    };
  }
};
