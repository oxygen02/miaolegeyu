const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { roomId } = event;
  const wxContext = cloud.getWXContext();

  if (!wxContext.OPENID) {
    return { code: -1, msg: '未登录' };
  }

  if (!roomId) {
    return { code: -1, msg: '房间号不能为空' };
  }

  try {
    // 查找房间
    const roomRes = await db.collection('rooms').where({ roomId }).get();

    if (roomRes.data.length === 0) {
      // 尝试在 dining_appointments 中查找
      const diningRes = await db.collection('dining_appointments').where({ _id: roomId }).get();
      if (diningRes.data.length > 0) {
        const apt = diningRes.data[0];
        // 权限校验：只有创建者才能删除
        if (apt.initiatorOpenId !== wxContext.OPENID) {
          return { code: -1, msg: '无权限删除此活动' };
        }
        // 级联删除约饭参与者记录
        try {
          await db.collection('dining_appointment_participants').where({ appointmentId: roomId }).remove();
        } catch (e) {
          console.log(`约饭活动 ${roomId} 无关联参与者记录`);
        }
        await db.collection('dining_appointments').doc(roomId).remove();
        console.log(`[deleteRoom] 用户 ${wxContext.OPENID} 删除了约饭活动 ${roomId}`);
        return { code: 0, msg: '约饭活动已删除' };
      }

      // 尝试在 schedule_votes 中查找
      const voteRes = await db.collection('schedule_votes').where({ _id: roomId }).get();
      if (voteRes.data.length > 0) {
        const vote = voteRes.data[0];
        // 权限校验：只有创建者才能删除
        if (vote.creatorOpenId !== wxContext.OPENID) {
          return { code: -1, msg: '无权限删除此投票' };
        }
        // 级联删除时间投票的参与者和投票记录
        try {
          await db.collection('schedule_vote_participants').where({ voteId: roomId }).remove();
        } catch (e) {
          console.log(`时间投票 ${roomId} 无关联参与者记录`);
        }
        try {
          await db.collection('schedule_vote_records').where({ voteId: roomId }).remove();
        } catch (e) {
          console.log(`时间投票 ${roomId} 无关联投票记录`);
        }
        await db.collection('schedule_votes').doc(roomId).remove();
        console.log(`[deleteRoom] 用户 ${wxContext.OPENID} 删除了时间投票 ${roomId}`);
        return { code: 0, msg: '投票活动已删除' };
      }

      return { code: -1, msg: '活动不存在' };
    }

    const room = roomRes.data[0];

    // 权限校验：只有创建者才能删除
    if (room.creatorOpenId !== wxContext.OPENID) {
      return { code: -1, msg: '无权限删除此活动，仅创建者可操作' };
    }

    // 使用事务确保级联删除的一致性
    const transaction = await db.startTransaction();
    try {
      // 删除房间
      await transaction.collection('rooms').doc(room._id).remove();

      // 删除房间参与者记录
      await transaction.collection('room_participants').where({ roomId }).remove();

      // 删除投票记录（之前遗漏）
      await transaction.collection('votes').where({ roomId }).remove();

      // 删除拼单参与者记录（之前遗漏）
      await transaction.collection('group_order_participants').where({ roomId }).remove();

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    console.log(`[deleteRoom] 用户 ${wxContext.OPENID} 删除了房间 ${roomId} (${room.title})`);

    return {
      code: 0,
      msg: '活动已删除',
      data: { roomId, title: room.title }
    };

  } catch (err) {
    console.error('删除活动失败:', err);
    return { code: -1, msg: '删除失败: ' + err.message };
  }
};
