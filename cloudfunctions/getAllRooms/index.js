const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { limit = 50, mode = '' } = event;

  // 检查用户登录态
  if (!wxContext.OPENID) {
    return {
      success: false,
      error: '用户未登录',
      rooms: []
    };
  }

  try {
    let whereClause = {
      status: 'voting' // 只显示进行中的活动
    };

    // 根据模式筛选
    if (mode === 'group') {
      whereClause.mode = 'group';
    } else if (mode === 'dining') {
      whereClause.mode = 'pick_for_them';
    } else if (mode === 'meal') {
      // 约饭模式不查询 rooms 集合，返回空
      return {
        success: true,
        rooms: []
      };
    } else if (mode === '' || mode === 'all') {
      // 全部模式：只查询 group 和 pick_for_them
      whereClause.mode = _.in(['group', 'pick_for_them']);
    }

    // 获取所有进行中的房间（只返回必要字段，脱敏处理）
    const { data: rooms } = await db.collection('rooms')
      .where(whereClause)
      .field({
        _id: true,
        roomId: true,
        title: true,
        status: true,
        mode: true,
        activityDate: true,
        activityTime: true,
        location: true,
        shopName: true,
        shopImage: true,
        platform: true,
        minAmount: true,
        deadline: true,
        createdAt: true,
        voteDeadline: true,
        finalPoster: true,
        candidatePosters: true,
        creatorNickName: true,
        creatorAvatarUrl: true
        // 注意：不返回 creatorOpenId 等敏感字段
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (!rooms || rooms.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }

    // 过滤掉 roomId 为空的文档，并记录日志
    const validRooms = rooms.filter(room => {
      if (!room.roomId) {
        console.log('发现 roomId 为空的文档:', room._id, room.title);
        return false;
      }
      return true;
    });
    console.log('有效房间数:', validRooms.length, '原始房间数:', rooms.length);

    // 获取所有房间ID
    const roomIds = validRooms.map(room => room.roomId);

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

    // 对于拼单模式，获取拼单参与者头像
    let participantAvatars = {};
    try {
      const { data: groupParticipants } = await db.collection('group_order_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true, openid: true })
        .get();

      // 按房间分组获取参与者
      const roomParticipantOpenIds = {};
      groupParticipants.forEach(p => {
        if (!roomParticipantOpenIds[p.roomId]) {
          roomParticipantOpenIds[p.roomId] = [];
        }
        roomParticipantOpenIds[p.roomId].push(p.openid);
      });

      // 使用默认头像（脱敏处理，不暴露真实openid）
      for (const roomId of Object.keys(roomParticipantOpenIds)) {
        participantAvatars[roomId] = roomParticipantOpenIds[roomId].map((openid, index) => ({
          avatarUrl: '/assets/images/cat-avatar-icon.png', // 默认头像
          index
          // 注意：不返回 openid
        }));
      }
    } catch (err) {
      console.error('获取拼单参与者头像失败:', err);
    }

    // 组装返回数据（脱敏处理）
    const roomsWithParticipants = validRooms.map(room => ({
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
      participantCount: participantCounts[room.roomId] || 0,
      creatorNickName: room.creatorNickName || '',
      creatorAvatarUrl: room.creatorAvatarUrl || '',
      // 拼单参与者头像
      participantAvatars: participantAvatars[room.roomId] || []
      // 注意：不返回 creatorOpenId 等敏感字段
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
