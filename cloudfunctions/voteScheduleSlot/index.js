const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId, slotKey, support } = event;

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
    if (now > deadline && vote.creatorOpenId !== OPENID) {
      return { success: false, error: '投票已截止' };
    }

    // 检查是否已参与（必须填了可用时间才能投票）
    const hasParticipated = vote.participants?.some(p => p.openId === OPENID);
    if (!hasParticipated) {
      return { success: false, error: '请先提交你的可用时间' };
    }

    // 获取现有投票
    const votes_list = vote.votes || [];
    const existingIndex = votes_list.findIndex(v => v.openId === OPENID);

    const newVote = {
      openId: OPENID,
      slotKey,
      support, // true/false
      voteTime: db.serverDate()
    };

    if (existingIndex >= 0) {
      votes_list[existingIndex] = newVote;
    } else {
      votes_list.push(newVote);
    }

    // 统计投票结果
    const supportCount = votes_list.filter(v => v.support && v.slotKey === slotKey).length;
    const opposeCount = votes_list.filter(v => !v.support && v.slotKey === slotKey).length;
    const totalVotes = votes_list.filter(v => v.slotKey === slotKey).length;

    // 更新数据库
    await db.collection('schedule_votes').doc(voteId).update({
      data: {
        votes: votes_list,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      supportCount,
      opposeCount,
      totalVotes
    };
  } catch (err) {
    console.error('voteScheduleSlot error:', err);
    return { success: false, error: err.message };
  }
};
