const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, nickName = '', avatarUrl = '', password = '' } = event;

  // 1. 校验登录态
  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  // 2. 参数校验
  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  try {
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction();

    try {
      // 3. 检查房间是否存在
      const roomResult = await transaction.collection('rooms').where({ roomId }).get();
      if (roomResult.data.length === 0) {
        await transaction.rollback();
        return { code: -1, msg: '房间不存在' };
      }

      const room = roomResult.data[0];

      // 4. 检查房间状态
      if (room.status !== 'voting') {
        await transaction.rollback();
        return { code: -1, msg: '房间已结束或已锁定，无法加入' };
      }

      // 5. 验证密码（如果房间设置了密码）
      if (room.needPassword && room.roomPassword) {
        if (!password) {
          await transaction.rollback();
          return { code: -1, msg: '该房间需要密码' };
        }
        // 对输入的密码进行md5哈希后比较
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
        if (hashedPassword !== room.roomPassword) {
          await transaction.rollback();
          return { code: -1, msg: '密码错误' };
        }
      }

      // 6. 检查房间是否已满员
      const participantResult = await transaction.collection('room_participants')
        .where({ roomId })
        .get();

      const maxCount = room.peopleCount || 50; // 默认最大50人
      if (participantResult.data.length >= maxCount) {
        await transaction.rollback();
        return { code: -1, msg: '房间已满员' };
      }

      // 7. 检查用户是否已在房间内（防止重复加入）
      const existingParticipant = participantResult.data.find(
        p => p.openid === wxContext.OPENID
      );

      if (existingParticipant) {
        await transaction.rollback();
        return { code: -1, msg: '您已在该房间中' };
      }
      
      // 7. 原子操作：添加参与者记录
      await transaction.collection('room_participants').add({
        data: {
          roomId,
          openid: wxContext.OPENID,
          role: 'participant',
          status: 'joined',
          nickName: nickName || '',
          avatarUrl: avatarUrl || '',
          vote: null,
          joinedAt: db.serverDate()
        }
      });
      
      // 8. 原子操作：增加房间参与人数
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
        msg: '加入成功',
        data: {
          roomId,
          roomTitle: room.title,
          mode: room.mode,
          status: room.status
        }
      };
      
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
    
  } catch (err) {
    console.error('joinRoom error:', err);
    return {
      code: -1,
      msg: err.message || '加入失败'
    };
  }
};
