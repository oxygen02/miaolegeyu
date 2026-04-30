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
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction();

    try {
      // 获取房间信息（在事务中查询）
      const { data: rooms } = await transaction.collection('rooms')
        .where({ roomId })
        .get();

      if (!rooms || rooms.length === 0) {
        await transaction.rollback();
        return { code: -1, msg: '房间不存在' };
      }

      const room = rooms[0];

      // 检查房间状态
      if (room.status !== 'voting') {
        await transaction.rollback();
        return { code: -1, msg: '拼单已结束' };
      }

      // 检查是否已达到最大参与人数
      if (room.maxParticipants && room.maxParticipants > 0) {
        const { data: currentParticipants } = await transaction.collection('group_order_participants')
          .where({ roomId })
          .get();

        // 检查用户是否已参与（已参与的不计入限制）
        const userExisting = currentParticipants.find(p => p.openid === OPENID);

        if (!userExisting && currentParticipants.length >= room.maxParticipants) {
          await transaction.rollback();
          return { code: -1, msg: '拼单已满员' };
        }
      }

      // 检查是否已参与
      const { data: existingParticipants } = await transaction.collection('group_order_participants')
        .where({
          roomId,
          openid: OPENID
        })
        .get();

      if (existingParticipants && existingParticipants.length > 0) {
        // 更新选择
        await transaction.collection('group_order_participants').doc(existingParticipants[0]._id).update({
          data: {
            selectedOptionIndex,
            note,
            updatedAt: db.serverDate()
          }
        });

        // 提交事务
        await transaction.commit();

        return {
          code: 0,
          msg: '更新成功',
          isUpdate: true
        };
      }

      // 添加新的参与记录
      await transaction.collection('group_order_participants').add({
        data: {
          roomId,
          openid: OPENID,
          selectedOptionIndex,
          note,
          joinedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });

      // 原子操作：增加房间参与人数
      await transaction.collection('rooms').doc(room._id).update({
        data: {
          participantCount: _.inc(1),
          updatedAt: db.serverDate()
        }
      });

      // 提交事务
      await transaction.commit();

      return {
        code: 0,
        msg: '参与成功',
        isUpdate: false
      };

    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('joinGroupOrder error:', err);
    return {
      code: -1,
      msg: err.message || '参与失败'
    };
  }
};
