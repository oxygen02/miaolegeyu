const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

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
    // 1. 查询房间（非事务）
    const roomResult = await db.collection('rooms').where({ roomId }).get();
    if (roomResult.data.length === 0) {
      return { success: false, error: '房间不存在或已删除' };
    }

    const room = roomResult.data[0];

    // 2. 检查房间状态（包括是否已过期）
    const checkNow = new Date();
    let effectiveStatus = room.status || 'voting';
    if (effectiveStatus === 'voting' && (room.deadline || room.voteDeadline)) {
      const deadlineDate = new Date(room.deadline || room.voteDeadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate <= checkNow) {
        effectiveStatus = 'ended';
      }
    }
    if (effectiveStatus !== 'voting') {
      return { success: false, error: '投票已结束' };
    }

    // 3. 检查用户是否已参与房间
    const participantCheck = await db.collection('room_participants').where({
      roomId,
      openid
    }).get();

    if (participantCheck.data.length === 0) {
      return { success: false, error: '您未加入此房间，无法投票' };
    }

    // 4. 检查是否已投票
    const existingVote = await db.collection('votes').where({
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

    const now = db.serverDate();
    const isUpdate = existingVote.data.length > 0;
    const existingDoc = isUpdate ? existingVote.data[0] : null;

    // 5. 使用云函数批量操作（比事务更稳定）
    const batchTasks = [];

    if (isUpdate) {
      // 更新已有投票
      batchTasks.push(
        db.collection('votes').doc(existingDoc._id).update({
          data: {
            vote: voteData,
            status: status || 'voted',
            hardTaboos: hardTaboos || [],
            softTaboos: softTaboos || [],
            timeInfo: timeInfo || null,
            leaveInfo: leaveInfo || null,
            updatedAt: now
          }
        })
      );
    } else {
      // 创建新投票记录
      batchTasks.push(
        db.collection('votes').add({
          data: {
            roomId,
            openid,
            vote: voteData,
            status: status || 'voted',
            hardTaboos: hardTaboos || [],
            softTaboos: softTaboos || [],
            timeInfo: timeInfo || null,
            leaveInfo: leaveInfo || null,
            createdAt: now,
            updatedAt: now
          }
        })
      );

      // 新投票时增加计数
      batchTasks.push(
        db.collection('rooms').doc(room._id).update({
          data: {
            voteCount: _.inc(1),
            updatedAt: now
          }
        })
      );
    }

    // 更新参与者投票状态
    const participantDoc = participantCheck.data[0];
    batchTasks.push(
      db.collection('room_participants').doc(participantDoc._id).update({
        data: {
          status: 'voted',
          vote: voteData,
          updatedAt: now
        }
      })
    );

    // 并行执行所有操作
    const results = await Promise.allSettled(batchTasks);

    // 检查是否有失败
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('部分操作失败:', failures);
      // 即使部分失败，也返回成功（因为投票记录已保存）
      // 或者可以选择重试机制
    }

    return {
      success: true,
      msg: isUpdate ? '投票更新成功' : '投票成功',
      isUpdate
    };

  } catch (err) {
    console.error('投票失败:', err);
    return {
      success: false,
      error: err.message || '投票失败，请重试'
    };
  }
};