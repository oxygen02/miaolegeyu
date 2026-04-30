const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { status = '' } = event;

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 1. 获取我参与的所有房间ID
    const participantResult = await db.collection('room_participants')
      .where({
        openid: wxContext.OPENID,
        role: _.in(['participant', 'creator'])
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

    // 3. 根据状态筛选
    if (status === 'voting') {
      whereCondition.status = 'voting';
    } else if (status === 'locked') {
      whereCondition.status = _.in(['locked', 'completed']);
    }

    // 4. 获取房间详情
    const roomResult = await db.collection('rooms')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .get();

    const rooms = roomResult.data || [];

    // 5. 获取创建者信息
    const creatorOpenIds = [...new Set(rooms.map(r => r.creatorOpenId))];
    let creatorInfos = [];

    if (creatorOpenIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < creatorOpenIds.length; i += batchSize) {
        const batch = creatorOpenIds.slice(i, i + batchSize);
        const userResult = await db.collection('users')
          .where({
            _openid: _.in(batch)
          })
          .get();
        creatorInfos = creatorInfos.concat(userResult.data || []);
      }
    }

    // 6. 组装数据
    const enrichedRooms = rooms.map(room => {
      const creator = creatorInfos.find(u => u._openid === room.creatorOpenId) || {};
      return {
        roomId: room.roomId,
        title: room.title,
        mode: room.mode,
        status: room.status,
        activityDate: room.activityDate || '',
        activityTime: room.activityTime || '',
        location: room.location || '',
        creatorName: creator.nickName || room.creatorNickName || '未知用户',
        creatorAvatar: creator.avatarUrl || room.creatorAvatarUrl || '',
        creatorId: room.creatorOpenId,
        isCreator: room.creatorOpenId === wxContext.OPENID,
        createdAt: room.createdAt
      };
    });

    return {
      code: 0,
      data: enrichedRooms,
      msg: '获取成功'
    };

  } catch (err) {
    console.error('getMyParticipatedRooms error:', err);
    return {
      code: -1,
      msg: err.message || '获取失败'
    };
  }
};
