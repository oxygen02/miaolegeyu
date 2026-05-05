const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = roomResult.data[0];
    const isCreator = room.creatorOpenId === wxContext.OPENID;

    // 获取参与者列表（包含用户信息）
    const participantsResult = await db.collection('room_participants')
      .where({ roomId })
      .get();

    const participants = participantsResult.data || [];

    // 获取用户详细信息
    const openids = participants.map(p => p.openid);
    let userInfos = [];
    
    if (openids.length > 0) {
      // 分批查询用户信息（每次最多100个）
      const batchSize = 100;
      for (let i = 0; i < openids.length; i += batchSize) {
        const batch = openids.slice(i, i + batchSize);
        const userResult = await db.collection('users')
          .where({
            _openid: db.command.in(batch)
          })
          .get();
        userInfos = userInfos.concat(userResult.data || []);
      }
    }

    // 合并参与者信息和用户信息
    const enrichedParticipants = participants.map((p, idx) => {
      const userInfo = userInfos.find(u => u._openid === p.openid) || {};
      return {
        id: p._id,
        openid: p.openid,
        nickName: userInfo.nickName || `用户${idx + 1}`,
        avatarUrl: userInfo.avatarUrl || '/assets/cat-default.png',
        isVoted: p.status === 'voted',
        isHost: p.openid === room.creatorOpenId,
        joinedAt: p.joinedAt,
        choices: p.vote ? (p.vote.cuisinePreferences || []) : []
      };
    });

    // 只有房主返回完整数据
    if (!isCreator) {
      return {
        code: 403,
        msg: '只有房主可查看控制台详情'
      };
    }

    // 处理 address 字段，确保返回字符串
    let addressStr = room.location || room.address || '';
    if (addressStr && typeof addressStr === 'object') {
      addressStr = addressStr.name || addressStr.title || addressStr.address || JSON.stringify(addressStr);
    }

    return {
      code: 0,
      data: {
        _id: room._id,
        roomId: room.roomId,
        roomCode: room.roomCode || room.roomId,
        title: room.title,
        address: addressStr,
        mealTime: room.appointmentDate || room.dinnerTime || room.mealTime || null,
        status: room.status || 'voting',
        isAnonymous: room.isAnonymous || false,
        needPassword: room.needPassword || false,
        roomPassword: room.roomPassword || '',
        deadline: room.deadline || room.voteDeadline || null,
        voteDeadline: room.voteDeadline || room.deadline || null,
        creatorOpenId: room.creatorOpenId,
        participants: enrichedParticipants,
        mode: room.mode || 'a'
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getRoomDetail error:', err);
    return { code: -1, msg: err.message || '获取房间详情失败' };
  }
};
