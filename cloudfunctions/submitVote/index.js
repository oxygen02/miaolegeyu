const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 参数校验
  if (!openid) {
    return { success: false, error: '用户未登录' };
  }

  const {
    roomId,
    posterIndices,
    vetoIndices,
    hardTaboos,
    softTaboos,
    timeInfo,
    leaveInfo,
    status
  } = event;

  if (!roomId) {
    return { success: false, error: '房间ID不能为空' };
  }

  try {
    // 确保 votes 集合存在
    try {
      await db.createCollection('votes');
      console.log('votes 集合创建成功');
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        console.log('votes 集合已存在');
      } else {
        console.log('votes 集合创建失败（可能已存在）:', err.message);
      }
    }

    // 使用事务确保数据一致性
    const transaction = await db.startTransaction();
    
    try {
      // 获取房间（在事务中查询）
      const roomResult = await transaction.collection('rooms').where({ roomId }).get();
      if (roomResult.data.length === 0) {
        await transaction.rollback();
        return { success: false, error: '房间不存在' };
      }

      const room = roomResult.data[0];

      // 检查房间状态
      if (room.status !== 'voting') {
        await transaction.rollback();
        return { success: false, error: '投票已结束' };
      }

      // 检查用户是否已参与房间
      const participantCheck = await transaction.collection('room_participants').where({
        roomId,
        openid
      }).get();

      if (participantCheck.data.length === 0) {
        await transaction.rollback();
        return { success: false, error: '您未加入此房间，无法投票' };
      }

      // 检查是否已投票（防止重复投票）
      const existingVote = await transaction.collection('votes').where({
        roomId,
        openid
      }).get();

      const voteData = {
        posterIndices: posterIndices || [],
        vetoIndices: vetoIndices || [],
        hardTaboos: hardTaboos || [],
        softTaboos: softTaboos || [],
        timestamp: new Date()
      };

      if (existingVote.data.length > 0) {
        // 删除旧记录，重新创建
        const existingDoc = existingVote.data[0];
        await transaction.collection('votes').doc(existingDoc._id).remove();
        
        // 创建新投票记录
        await transaction.collection('votes').add({
          data: {
            roomId,
            openid,
            vote: voteData,
            status: status || 'voted',
            hardTaboos: hardTaboos || [],
            softTaboos: softTaboos || [],
            timeInfo: timeInfo || null,
            leaveInfo: leaveInfo || null,
            createdAt: existingDoc.createdAt || db.serverDate(),
            updatedAt: db.serverDate()
          }
        });
      } else {
        // 创建新投票记录
        await transaction.collection('votes').add({
          data: {
            roomId,
            openid,
            vote: voteData,
            status: status || 'voted',
            hardTaboos: hardTaboos || [],
            softTaboos: softTaboos || [],
            timeInfo: timeInfo || null,
            leaveInfo: leaveInfo || null,
            createdAt: db.serverDate(),
            updatedAt: db.serverDate()
          }
        });

        // 原子操作：增加房间投票计数
        await transaction.collection('rooms').doc(room._id).update({
          data: {
            voteCount: _.inc(1),
            updatedAt: db.serverDate()
          }
        });
      }

      // 更新参与者投票状态
      await transaction.collection('room_participants').where({
        roomId,
        openid
      }).update({
        data: {
          status: 'voted',
          vote: voteData,
          updatedAt: db.serverDate()
        }
      });

      // 提交事务
      await transaction.commit();

      return { success: true, msg: '投票成功' };
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error('投票失败:', err);
    return { success: false, error: err.message || '投票失败' };
  }
};
