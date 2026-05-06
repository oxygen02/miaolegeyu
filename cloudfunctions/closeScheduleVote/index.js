const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId, confirmedSlot } = event;

  try {
    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    if (!votes || votes.length === 0) {
      return { success: false, error: '投票不存在' };
    }

    const vote = votes[0];

    // 只有发起人可以关闭/确认
    if (vote.creatorOpenId !== OPENID) {
      return { success: false, error: '无权限' };
    }

    await db.collection('schedule_votes').doc(voteId).update({
      data: {
        status: 'confirmed',
        confirmedSlot,
        closedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return { success: true };
  } catch (err) {
    console.error('closeScheduleVote error:', err);
    return { success: false, error: err.message };
  }
};
