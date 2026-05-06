const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId, availability, flexibility, preferredSlots, matrix } = event;

  try {
    // 获取投票信息
    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    if (!votes || votes.length === 0) {
      return { success: false, error: '投票不存在' };
    }

    const vote = votes[0];

    // 检查是否已截止
    const now = new Date();
    const deadline = new Date(vote.deadline);
    if (now > deadline) {
      return { success: false, error: '投票已截止' };
    }

    // 获取用户信息
    const { result: userInfo } = await cloud.callFunction({
      name: 'getUserInfo',
      data: { openId: OPENID }
    }).catch(() => ({ result: null }));

    const name = userInfo?.nickName || '神秘喵友';
    const avatar = userInfo?.avatarUrl || '';

    // 获取现有参与者
    const participants = vote.participants || [];
    const existingIndex = participants.findIndex(p => p.openId === OPENID);

    const newParticipant = {
      openId: OPENID,
      name,
      avatar,
      availability: availability || {},
      flexibility: flexibility || 2,
      preferredSlots: preferredSlots || [],
      matrix: matrix || {}, // 新的时间矩阵级别数据
      submitTime: db.serverDate()
    };

    if (existingIndex >= 0) {
      participants[existingIndex] = newParticipant;
    } else {
      participants.push(newParticipant);
    }

    // 更新数据库
    await db.collection('schedule_votes').doc(voteId).update({
      data: {
        participants,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      participantCount: participants.length
    };
  } catch (err) {
    console.error('submitAvailability error:', err);
    return { success: false, error: err.message };
  }
};
