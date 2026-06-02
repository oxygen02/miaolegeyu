const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { dryRun = true } = event; // 默认只查询不删除

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  try {
    const now = new Date();

    // 查询所有已过期的时间投票（由当前用户发起的）
    const { data: expiredVotes } = await db.collection('schedule_votes')
      .where({
        creatorOpenId: OPENID,
        deadline: _.lt(now)
      })
      .get();

    console.log(`找到 ${expiredVotes.length} 个过期的时间投票`);

    if (dryRun) {
      // 只返回列表，不删除
      return {
        success: true,
        dryRun: true,
        count: expiredVotes.length,
        votes: expiredVotes.map(v => ({
          _id: v._id,
          title: v.title,
          deadline: v.deadline,
          creatorOpenId: v.creatorOpenId
        }))
      };
    }

    // 执行删除
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const vote of expiredVotes) {
      try {
        // 删除主文档
        await db.collection('schedule_votes').doc(vote._id).remove();

        // 删除关联记录
        try {
          const { data: participants } = await db.collection('schedule_vote_participants')
            .where({ voteId: vote._id })
            .get();
          for (const p of participants) {
            await db.collection('schedule_vote_participants').doc(p._id).remove();
          }
        } catch (e) {
          console.log(`vote ${vote._id} 没有关联参与者记录`);
        }

        try {
          const { data: records } = await db.collection('schedule_vote_records')
            .where({ voteId: vote._id })
            .get();
          for (const r of records) {
            await db.collection('schedule_vote_records').doc(r._id).remove();
          }
        } catch (e) {
          console.log(`vote ${vote._id} 没有关联投票记录`);
        }

        successCount++;
      } catch (err) {
        failCount++;
        errors.push({ voteId: vote._id, error: err.message });
        console.error(`删除 vote ${vote._id} 失败:`, err);
      }
    }

    return {
      success: true,
      dryRun: false,
      total: expiredVotes.length,
      successCount,
      failCount,
      errors
    };
  } catch (err) {
    console.error('cleanupExpiredScheduleVotes error:', err);
    return { success: false, error: err.message };
  }
};
