const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { roomId } = event;

  if (!OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  if (!roomId) {
    return { code: -1, msg: '缺少 roomId 参数' };
  }

  try {
    // 1. 检查房间是否存在
    const { data: rooms } = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!rooms || rooms.length === 0) {
      return { code: -1, msg: '活动不存在' };
    }

    const room = rooms[0];

    // 2. 不能退出自己创建的活动
    if (room.creatorOpenId === OPENID) {
      return { code: -1, msg: '发起人不能退出活动' };
    }

    // 3. 从 room_participants 中移除
    const { stats: removeStats } = await db.collection('room_participants')
      .where({
        roomId,
        openid: OPENID
      })
      .remove();

    // 4. 从 group_order_participants 中移除（如果存在）
    try {
      await db.collection('group_order_participants')
        .where({
          roomId,
          openid: OPENID
        })
        .remove();
    } catch (err) {
      console.log('group_order_participants 移除失败或不存在:', err.message);
    }

    // 5. 更新房间的参与人数
    const { data: remainingParticipants } = await db.collection('room_participants')
      .where({ roomId })
      .get();
    
    await db.collection('rooms').doc(room._id).update({
      data: {
        participantCount: remainingParticipants.length,
        updatedAt: db.serverDate()
      }
    });

    return {
      code: 0,
      msg: '退出成功',
      removed: removeStats.removed || 0
    };
  } catch (err) {
    console.error('quitGroupOrder error:', err);
    return { code: -1, msg: err.message || '退出失败' };
  }
};
