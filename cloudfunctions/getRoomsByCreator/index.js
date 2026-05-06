const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { status = 'all' } = event; // all, active, locked

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 1. 从 room_participants 获取我作为 creator 的所有房间ID
    const participantResult = await db.collection('room_participants')
      .where({
        openid: wxContext.OPENID,
        role: 'creator'
      })
      .get();

    const roomIds = participantResult.data.map(p => p.roomId);

    if (roomIds.length === 0) {
      return {
        code: 0,
        data: [],
        msg: '获取成功'
      };
    }

    // 2. 构建查询条件
    let whereCondition = {
      roomId: _.in(roomIds)
    };

    if (status === 'active' || status === 'voting') {
      whereCondition.status = 'voting';
    } else if (status === 'locked') {
      whereCondition.status = 'locked';
    }

    // 3. 获取房间详情
    const { data: rooms } = await db.collection('rooms')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .get();

    // 4. 按发起人分组
    const creatorGroups = {};

    rooms.forEach(room => {
      const creatorId = room.creatorOpenId || 'unknown';

      if (!creatorGroups[creatorId]) {
        creatorGroups[creatorId] = {
          creatorId: creatorId,
          creatorName: room.creatorName || '神秘喵友',
          creatorAvatar: room.creatorAvatar || '',
          rooms: []
        };
      }

      creatorGroups[creatorId].rooms.push({
        roomId: room.roomId,
        title: room.title,
        status: room.status,
        activityDate: room.activityDate,
        activityTime: room.activityTime,
        location: room.location,
        createdAt: room.createdAt,
        voteDeadline: room.voteDeadline,
        finalPoster: room.finalPoster,
        candidatePosters: room.candidatePosters || []
      });
    });

    // 5. 转换为数组
    const groupedRooms = Object.values(creatorGroups);

    return {
      code: 0,
      data: groupedRooms,
      msg: '获取成功'
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message
    };
  }
};
