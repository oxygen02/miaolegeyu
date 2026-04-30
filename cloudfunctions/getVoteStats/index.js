const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = roomResult.data[0];

    // 权限校验
    const isCreator = room.creatorOpenId === wxContext.OPENID;
    if (!isCreator) {
      return { code: 403, msg: '只有房主可查看投票统计' };
    }

    // 获取所有参与者
    const participantsResult = await db.collection('room_participants')
      .where({ roomId })
      .get();

    const participants = participantsResult.data || [];
    const totalCount = participants.length;
    const votedCount = participants.filter(p => p.status === 'voted').length;
    const progressPercent = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

    // 统计投票选项
    const optionStats = {};
    
    participants.forEach(p => {
      if (p.status !== 'voted' || !p.vote) return;

      const vote = p.vote;
      
      // Mode B: 统计细类选择
      if (vote.cuisinePreferences) {
        vote.cuisinePreferences.forEach(pref => {
          (pref.subCategories || []).forEach(subName => {
            const key = `${pref.categoryId}_${subName}`;
            if (!optionStats[key]) {
              optionStats[key] = {
                id: key,
                name: subName,
                category: pref.categoryName || pref.categoryId,
                count: 0
              };
            }
            optionStats[key].count++;
          });
        });
      }
      
      // Mode A: 统计海报选择
      if (vote.posterIndices) {
        vote.posterIndices.forEach(idx => {
          const key = `poster_${idx}`;
          if (!optionStats[key]) {
            const poster = (room.candidatePosters || [])[idx] || {};
            optionStats[key] = {
              id: key,
              name: poster.title || `选项${idx + 1}`,
              image: poster.imageUrl || '',
              count: 0
            };
          }
          optionStats[key].count++;
        });
      }
    });

    // 转换为数组并排序
    let topOptions = Object.values(optionStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(opt => ({
        ...opt,
        percent: votedCount > 0 ? Math.round((opt.count / votedCount) * 100) : 0
      }));

    return {
      code: 0,
      data: {
        votedCount,
        unvotedCount: totalCount - votedCount,
        progressPercent,
        topOptions
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getVoteStats error:', err);
    return { code: -1, msg: err.message || '获取投票统计失败' };
  }
};
