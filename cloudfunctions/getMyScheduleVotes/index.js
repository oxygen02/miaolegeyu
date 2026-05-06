const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 获取我的时间投票列表
 * 参数：
 *   - mode: 'created' | 'participated' | 'all' （默认 all）
 *   - limit: 数量限制（默认 100）
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { mode = 'all', limit = 100 } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  try {
    let query = {};

    if (mode === 'created') {
      // 我发起的
      query = { creatorOpenId: OPENID };
    } else if (mode === 'participated') {
      // 我参与的（在 participants 数组中，但不是发起人）
      query = {
        participants: _.elemMatch({
          openId: OPENID
        }),
        creatorOpenId: _.neq(OPENID)
      };
    } else {
      // 全部：我发起的或我参与的
      query = _.or([
        { creatorOpenId: OPENID },
        {
          participants: _.elemMatch({
            openId: OPENID
          })
        }
      ]);
    }

    const { data: votes } = await db.collection('schedule_votes')
      .where(query)
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    const now = new Date();

    const formattedVotes = votes.map(vote => {
      const deadline = new Date(vote.deadline);
      const isExpired = now > deadline;
      const isCreator = vote.creatorOpenId === OPENID;
      const myParticipation = vote.participants?.find(p => p.openId === OPENID);
      const hasVoted = !!myParticipation;

      // 计算最佳日期（简化版）
      let bestDate = '';
      let bestScore = -1;
      if (vote.candidateDates && vote.participants) {
        vote.candidateDates.forEach(date => {
          let preferred = 0, ok = 0;
          vote.participants.forEach(p => {
            const level = p.matrix?.[date];
            if (level === 3) preferred++;
            else if (level === 2) ok++;
          });
          const score = preferred * 3 + ok * 2;
          if (score > bestScore) {
            bestScore = score;
            bestDate = date;
          }
        });
      }

      return {
        _id: vote._id,
        title: vote.title,
        description: vote.description,
        candidateDates: vote.candidateDates || [],
        timePeriod: vote.timePeriod || 'lunch',
        deadline: vote.deadline,
        status: vote.status,
        confirmedSlot: vote.confirmedSlot,
        participantCount: vote.participants?.length || 0,
        voteCount: vote.votes?.length || 0,
        isExpired,
        isCreator,
        hasVoted,
        bestDate,
        createTime: vote.createTime
      };
    });

    return {
      success: true,
      votes: formattedVotes,
      count: formattedVotes.length
    };
  } catch (err) {
    console.error('getMyScheduleVotes error:', err);
    return { success: false, error: err.message };
  }
};
