const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 敏感词库
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  // 其他违规
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

function containsSensitive(text) {
  if (!text) return false;
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) return true;
  }
  return false;
}

/**
 * 获取我的时间投票列表
 * 参数：
 *   - mode: 'created' | 'participated' | 'all' （默认 all）
 *   - status: 'all' | 'active' | 'locked' （默认 all）
 *   - limit: 数量限制（默认 100）
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { mode = 'all', status = 'all', limit = 100 } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  try {
    const now = new Date();

    // 先获取所有相关投票（不过滤 deadline）
    let query = {};

    if (mode === 'created') {
      query = { creatorOpenId: OPENID };
    } else if (mode === 'participated') {
      query = {
        'participants.openId': OPENID,
        creatorOpenId: _.neq(OPENID)
      };
    } else {
      query = _.or([
        { creatorOpenId: OPENID },
        { 'participants.openId': OPENID }
      ]);
    }

    const { data: votes } = await db.collection('schedule_votes')
      .where(query)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    // 根据状态筛选（在内存中处理，避免复杂查询组合）
    let statusFilteredVotes = votes;
    if (status === 'active') {
      statusFilteredVotes = votes.filter(vote => {
        const d = vote.deadline ? new Date(vote.deadline) : null;
        return d && now <= d;
      });
    } else if (status === 'locked') {
      statusFilteredVotes = votes.filter(vote => {
        const d = vote.deadline ? new Date(vote.deadline) : null;
        return d && now > d;
      });
    }

    // 过滤违规内容
    const filteredVotes = statusFilteredVotes.filter(vote => {
      const textToCheck = [vote.title, vote.location, vote.description].filter(Boolean).join(' ');
      if (containsSensitive(textToCheck)) {
        console.log('过滤违规投票:', vote._id, vote.title);
        return false;
      }
      return true;
    });

    const formattedVotes = filteredVotes.map(vote => {
      const deadline = vote.deadline ? new Date(vote.deadline) : null;
      const isExpired = deadline ? now > deadline : false;
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
        createdAt: vote.createdAt,
        // 发起人信息
        creatorNickName: vote.creatorNickName || (vote.participants && vote.participants[0] && vote.participants[0].isHost && vote.participants[0].nickName) || '',
        creatorAvatarUrl: vote.creatorAvatarUrl || (vote.participants && vote.participants[0] && vote.participants[0].isHost && vote.participants[0].avatarUrl) || '',
        // 传递participants信息供前端使用
        participants: vote.participants?.map(p => ({
          openId: p.openId,
          nickName: p.nickName,
          avatarUrl: p.avatarUrl,
          isHost: p.isHost
        })) || []
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
