const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId } = event;

  try {
    if (!voteId) {
      return { success: false, error: '缺少 voteId 参数' };
    }

    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    if (!votes || votes.length === 0) {
      return { success: false, error: '投票活动不存在' };
    }

    const vote = votes[0];

    // 只有发起人可以删除
    if (vote.creatorOpenId !== OPENID) {
      return { success: false, error: '无权限删除此活动' };
    }

    // 直接删除，不使用事务（事务中不支持 .where().get()）
    try {
      // 1. 删除主文档
      await db.collection('schedule_votes').doc(voteId).remove();

      // 2. 删除关联的参与记录（如果存在单独的集合）
      try {
        const { data: participants } = await db.collection('schedule_vote_participants')
          .where({ voteId: voteId })
          .get();
        
        if (participants && participants.length > 0) {
          for (const participant of participants) {
            await db.collection('schedule_vote_participants').doc(participant._id).remove();
          }
        }
      } catch (err) {
        console.log('schedule_vote_participants 集合不存在或已清空:', err.message);
      }

      // 3. 删除关联的投票记录（如果存在单独的集合）
      try {
        const { data: voteRecords } = await db.collection('schedule_vote_records')
          .where({ voteId: voteId })
          .get();
        
        if (voteRecords && voteRecords.length > 0) {
          for (const record of voteRecords) {
            await db.collection('schedule_vote_records').doc(record._id).remove();
          }
        }
      } catch (err) {
        console.log('schedule_vote_records 集合不存在或已清空:', err.message);
      }

      return { 
        success: true, 
        message: '活动及其关联数据已彻底删除' 
      };
    } catch (err) {
      console.error('删除失败:', err);
      return { success: false, error: err.message || '删除失败' };
    }
  } catch (err) {
    console.error('deleteScheduleVote error:', err);
    return { success: false, error: err.message || '删除失败' };
  }
};