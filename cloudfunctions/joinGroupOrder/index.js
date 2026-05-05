const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { roomId, selectedOptionIndex, note = '' } = event;
  const { OPENID } = cloud.getWXContext();

  // 参数校验
  if (!OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  if (!roomId || selectedOptionIndex === undefined) {
    return { code: -1, msg: '参数错误' };
  }

  try {
    // 获取房间信息
    const { data: rooms } = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!rooms || rooms.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = rooms[0];
    const isCreator = room.creatorOpenId === OPENID;

    // 检查房间状态
    if (room.status !== 'voting') {
      return { code: -1, msg: '拼单已结束' };
    }

    // 检查是否已参与（发起人也可以参与自己的拼单）
    const { data: existingParticipants } = await db.collection('group_order_participants')
      .where({
        roomId,
        openid: OPENID
      })
      .get();

    if (existingParticipants && existingParticipants.length > 0) {
      // 已参与过，更新选择
      await db.collection('group_order_participants').doc(existingParticipants[0]._id).update({
        data: {
          selectedOptionIndex,
          note,
          updatedAt: db.serverDate()
        }
      });

      return {
        code: 0,
        msg: '更新成功',
        isUpdate: true
      };
    }

    // 新增参与记录（发起人和普通用户一样可以参与）
    await db.collection('group_order_participants').add({
      data: {
        roomId,
        openid: OPENID,
        selectedOptionIndex,
        note,
        joinedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    // 增加房间参与人数
    await db.collection('rooms').doc(room._id).update({
      data: {
        participantCount: _.inc(1),
        updatedAt: db.serverDate()
      }
    });

    return {
      code: 0,
      msg: '参与成功',
      isUpdate: false
    };

  } catch (err) {
    console.error('joinGroupOrder error:', err);
    return {
      code: -1,
      msg: err.message || '参与失败，请稍后重试'
    };
  }
};
