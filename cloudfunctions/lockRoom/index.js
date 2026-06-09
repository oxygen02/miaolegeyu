const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, finalPosterIndex, finalTime, finalAddress } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 获取房间（通过 roomId 字段查询，不是 _id）
    const roomResult = await db.collection('rooms').where({ roomId }).limit(1).get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在或已删除' };
    }

    const room = roomResult.data[0];

    // 检查权限（只有创建者可以锁定）
    if (room.creatorOpenId !== wxContext.OPENID) {
      return { code: 403, msg: '只有发起人才能锁定房间' };
    }

    // 检查房间状态
    if (room.status !== 'voting') {
      return { code: -1, msg: '房间已锁定或已取消' };
    }

    // 检查最低参与人数（至少需要2人参与才可锁定，防止单人锁定）
    const participantResult = await db.collection('room_participants').where({ roomId }).count();
    const totalParticipants = participantResult.total || 0;
    if (totalParticipants < 2) {
      return { code: -1, msg: `至少需要2人参与才能锁定结果，当前仅${totalParticipants}人` };
    }

    // 检查是否已过期
    if (room.deadline || room.voteDeadline) {
      const deadlineDate = new Date(room.deadline || room.voteDeadline);
      const now = new Date();
      if (!isNaN(deadlineDate.getTime()) && deadlineDate <= now) {
        return { code: -1, msg: '活动已过期，无法锁定' };
      }
    }

    // 获取最终海报
    let finalPoster = null;
    if (finalPosterIndex !== undefined && room.candidatePosters && room.candidatePosters[finalPosterIndex]) {
      finalPoster = {
        ...room.candidatePosters[finalPosterIndex],
        time: finalTime ? new Date(finalTime) : null,
        address: finalAddress || ''
      };
    }

    // 更新房间状态
    await db.collection('rooms').doc(room._id).update({
      data: {
        status: 'locked',
        finalPoster,
        lockedAt: db.serverDate()
      }
    });
    
    return {
      code: 0,
      data: { roomId, status: 'locked' },
      msg: '房间已锁定'
    };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
