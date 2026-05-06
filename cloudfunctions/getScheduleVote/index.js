const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 计算最佳公共时间
 */
function calculateConsensus(participants, allSlots) {
  const slotMap = {};

  // 初始化所有slots
  allSlots.forEach(slot => {
    slotMap[slot.key] = {
      ...slot,
      availablePeople: [],
      preferredPeople: [],
      totalScore: 0,
      coverage: 0
    };
  });

  // 统计每个slot的参与情况
  participants.forEach(p => {
    const weight = (p.flexibility || 2) + 1;

    // 可用时间
    Object.entries(p.availability || {}).forEach(([date, times]) => {
      times.forEach(time => {
        const key = `${date}_${time}`;
        if (slotMap[key]) {
          slotMap[key].availablePeople.push({
            openId: p.openId,
            name: p.name,
            avatar: p.avatar,
            flexibility: p.flexibility || 2
          });
          slotMap[key].totalScore += weight;
        }
      });
    });

    // 偏好时间额外加分
    (p.preferredSlots || []).forEach(key => {
      if (slotMap[key]) {
        slotMap[key].preferredPeople.push(p.openId);
        slotMap[key].totalScore += 3;
      }
    });
  });

  // 计算覆盖率并排序
  const totalPeople = participants.length;
  const results = Object.values(slotMap)
    .map(slot => {
      const coverage = totalPeople > 0 ? slot.availablePeople.length / totalPeople : 0;
      const preferenceBonus = slot.preferredPeople.length * 2;
      const consensusScore = coverage * 100 + slot.totalScore * 0.5 + preferenceBonus * 10;

      return {
        ...slot,
        coverage: Math.round(coverage * 100),
        consensusScore: Math.round(consensusScore),
        missingPeople: totalPeople > 0 ?
          participants
            .filter(p => !slot.availablePeople.some(ap => ap.openId === p.openId))
            .map(p => ({ name: p.name, flexibility: p.flexibility || 2 }))
          : []
      };
    })
    .sort((a, b) => {
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      if (b.consensusScore !== a.consensusScore) return b.consensusScore - a.consensusScore;
      return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    });

  return results;
}

/**
 * 生成智能建议
 */
function generateSuggestion(topSlot, totalPeople) {
  if (!topSlot || topSlot.missingPeople.length === 0) {
    return '所有人都方便，太棒了！';
  }

  const flexibles = topSlot.missingPeople.filter(p => p.flexibility >= 2);
  const stubborn = topSlot.missingPeople.filter(p => p.flexibility <= 1);

  if (flexibles.length > 0 && stubborn.length === 0) {
    const names = flexibles.map(p => p.name).join('、');
    return `${names}表示可以商量，建议选这个时段`;
  } else if (stubborn.length > 0) {
    const names = stubborn.map(p => p.name).join('、');
    return `${names}时间确实不方便，可能需要协调`;
  }
  return null;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId } = event;

  try {
    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    if (!votes || votes.length === 0) {
      return { success: false, error: '投票不存在' };
    }

    const vote = votes[0];

    // 计算共识
    const consensusSlots = calculateConsensus(vote.participants || [], vote.allSlots || []);

    // 生成建议
    const top3Slots = consensusSlots.slice(0, 3);
    const suggestion = top3Slots.length > 0 ?
      generateSuggestion(top3Slots[0], vote.participants.length) : null;

    // 检查当前用户是否已参与
    const myParticipation = vote.participants?.find(p => p.openId === OPENID);
    const myVote = vote.votes?.find(v => v.openId === OPENID);

    // 匿名处理
    let participants = vote.participants || [];
    if (vote.anonymous && vote.creatorOpenId !== OPENID) {
      participants = participants.map(p => ({
        ...p,
        openId: 'anonymous',
        name: '匿名用户'
      }));
    }

    // 获取发起人信息
    let creatorInfo = { name: '', avatar: '' };
    try {
      const { result: userResult } = await cloud.callFunction({
        name: 'getUserInfo',
        data: { openId: vote.creatorOpenId }
      }).catch(() => ({ result: null }));
      if (userResult) {
        creatorInfo = {
          name: userResult.nickName || '神秘喵友',
          avatar: userResult.avatarUrl || ''
        };
      }
    } catch (e) {
      // 获取失败不阻断主流程
    }

    // 检查是否已截止
    const now = new Date();
    const deadline = new Date(vote.deadline);
    const isExpired = now > deadline;
    const isCreator = vote.creatorOpenId === OPENID;

    return {
      success: true,
      vote: {
        _id: vote._id,
        title: vote.title,
        description: vote.description,
        candidateDates: vote.candidateDates,
        timeRange: vote.timeRange,
        timePeriod: vote.timePeriod || 'lunch',
        minParticipants: vote.minParticipants,
        deadline: vote.deadline,
        anonymous: vote.anonymous,
        status: vote.status,
        confirmedSlot: vote.confirmedSlot,
        participantCount: vote.participants?.length || 0,
        voteCount: vote.votes?.length || 0,
        isExpired,
        isCreator,
        creatorName: creatorInfo.name,
        creatorAvatar: creatorInfo.avatar,
        creatorOpenId: vote.creatorOpenId
      },
      consensusSlots: top3Slots,
      suggestion,
      participants: participants.map(p => ({
        openId: p.openId,
        name: p.name || '神秘喵友',
        avatar: p.avatar || '',
        matrix: p.matrix || {},
        availability: p.availability || {},
        preferredSlots: p.preferredSlots || [],
        flexibility: p.flexibility || 2,
        submitTime: p.submitTime
      })),
      myParticipation: myParticipation ? {
        availability: myParticipation.availability,
        flexibility: myParticipation.flexibility,
        preferredSlots: myParticipation.preferredSlots,
        matrix: myParticipation.matrix
      } : null,
      myVote: myVote ? { slotKey: myVote.slotKey, support: myVote.support } : null,
      allVotes: vote.votes || []
    };
  } catch (err) {
    console.error('getScheduleVote error:', err);
    return { success: false, error: err.message };
  }
};
