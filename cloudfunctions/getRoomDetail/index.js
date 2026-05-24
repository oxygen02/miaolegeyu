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
    // 并行查询房间信息和参与者列表
    const [roomResult, participantsResult] = await Promise.all([
      db.collection('rooms').where({ roomId }).limit(1).get(),
      db.collection('room_participants').where({ roomId }).get()
    ]);

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在或已删除' };
    }

    const room = roomResult.data[0];
    const isCreator = room.creatorOpenId === wxContext.OPENID;

    const participants = participantsResult.data || [];

    // 获取用户详细信息（并行分批查询）
    const openids = participants.map(p => p.openid);
    let userInfos = [];

    if (openids.length > 0) {
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < openids.length; i += batchSize) {
        const batch = openids.slice(i, i + batchSize);
        batches.push(
          db.collection('users')
            .where({ _openid: db.command.in(batch) })
            .get()
        );
      }
      const userResults = await Promise.all(batches);
      userResults.forEach(r => {
        userInfos = userInfos.concat(r.data || []);
      });
    }

    // 合并参与者信息和用户信息
    const enrichedParticipants = participants.map((p, idx) => {
      const userInfo = userInfos.find(u => u._openid === p.openid) || {};
      return {
        id: p._id,
        openid: p.openid,
        nickName: userInfo.nickName || `用户${idx + 1}`,
        avatarUrl: userInfo.avatarUrl || '/assets/cat-default.png',
        isVoted: p.status === 'voted',
        isHost: p.openid === room.creatorOpenId,
        joinedAt: p.joinedAt,
        choices: p.vote ? (p.vote.cuisinePreferences || []) : []
      };
    });

    // 统计投票数据（单次遍历完成所有统计）
    const totalCount = enrichedParticipants.length;
    let votedCount = 0;
    const optionStats = {};

    enrichedParticipants.forEach(p => {
      if (p.isVoted) {
        votedCount++;
        // Mode A: 海报投票（从 choices 统计）
        if (p.choices && p.choices.length > 0 && room.candidatePosters) {
          p.choices.forEach(choice => {
            const choiceName = typeof choice === 'string' ? choice : (choice.name || choice.subCategory || '');
            if (!choiceName) return;
            if (!optionStats[choiceName]) {
              optionStats[choiceName] = { name: choiceName, count: 0 };
            }
            optionStats[choiceName].count++;
          });
        }
      }
    });

    // 如果 choices 未统计到，尝试从原始 participant.vote 字段补充统计
    const hasChoicesStats = Object.keys(optionStats).length > 0;
    if (!hasChoicesStats) {
      participants.forEach(p => {
        if (p.status !== 'voted' || !p.vote) return;
        // Mode B: subCategories
        if (p.vote.cuisinePreferences) {
          p.vote.cuisinePreferences.forEach(pref => {
            (pref.subCategories || []).forEach(subName => {
              if (!optionStats[subName]) {
                optionStats[subName] = { name: subName, count: 0 };
              }
              optionStats[subName].count++;
            });
          });
        }
        // Mode A: posterIndices
        if (p.vote.posterIndices && room.candidatePosters) {
          p.vote.posterIndices.forEach(idx => {
            const poster = room.candidatePosters[idx] || {};
            const name = poster.title || `选项${idx + 1}`;
            if (!optionStats[name]) {
              optionStats[name] = { name, count: 0, image: poster.imageUrl || '' };
            }
            optionStats[name].count++;
          });
        }
      });
    }

    // 排序取前3
    const topOptions = Object.values(optionStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(opt => ({
        ...opt,
        percent: votedCount > 0 ? Math.round((opt.count / votedCount) * 100) : 0
      }));

    // 计算衍生统计值
    const unvotedCount = totalCount - votedCount;
    const progressPercent = totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

    // 检查是否已过期（deadline已过且状态不是locked）
    const now = new Date();
    let effectiveStatus = room.status || 'voting';
    if (effectiveStatus === 'voting' && room.deadline) {
      const deadlineDate = new Date(room.deadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate <= now) {
        effectiveStatus = 'ended';
      }
    }

    // 只有房主返回完整数据
    if (!isCreator) {
      return {
        code: 403,
        msg: '只有房主可查看控制台详情'
      };
    }

    return {
      code: 0,
      data: {
        roomId: room.roomId,
        roomCode: room.roomCode || room.roomId,
        title: room.title,
        address: room.address || '',
        mealTime: room.mealTime,
        status: effectiveStatus,
        originalStatus: room.status || 'voting',
        isAnonymous: room.isAnonymous || false,
        deadline: room.deadline || null,
        // 移除敏感字段 creatorOpenId，前端已通过 isCreator 判断权限
        participants: enrichedParticipants,
        mode: room.mode || 'a',
        // 统计数据
        stats: {
          totalCount,
          votedCount,
          unvotedCount,
          progressPercent
        },
        topOptions
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getRoomDetail error:', err);
    // 区分不同类型的错误，给前端更友好的提示
    let errorMsg = '获取房间详情失败';
    if (err.message && err.message.includes('timeout')) {
      errorMsg = '请求超时，请稍后重试';
    } else if (err.message && err.message.includes('network')) {
      errorMsg = '网络异常，请检查网络连接';
    } else if (err.message) {
      errorMsg = err.message;
    }
    return { code: -1, msg: errorMsg };
  }
};
