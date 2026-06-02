const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId } = event;

  console.log('=== deleteScheduleVote 开始 ===');
  console.log('voteId:', JSON.stringify(voteId), 'type:', typeof voteId);
  console.log('OPENID:', OPENID);

  try {
    if (!voteId) {
      return { success: false, error: '缺少 voteId 参数' };
    }

    // 使用 where 查询（比 doc 更健壮，兼容各种 _id 格式）
    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    console.log('查询结果数量:', votes ? votes.length : 0);

    if (!votes || votes.length === 0) {
      // 尝试用 roomId 字段查询
      const { data: votesByRoomId } = await db.collection('schedule_votes')
        .where({ roomId: voteId })
        .limit(1)
        .get();
      
      console.log('roomId 查询结果数量:', votesByRoomId ? votesByRoomId.length : 0);

      if (!votesByRoomId || votesByRoomId.length === 0) {
        return { success: false, error: '投票活动不存在', debug: { voteId, searchedBy: '_id and roomId' } };
      }

      // 用 roomId 找到了，继续用这个
      var targetVote = votesByRoomId[0];
      var actualId = targetVote._id;
      console.log('通过 roomId 找到投票, 实际 _id:', actualId);
    } else {
      var targetVote = votes[0];
      var actualId = targetVote._id;
    }

    console.log('目标投票:', {
      _id: targetVote._id,
      title: targetVote.title,
      creatorOpenId: targetVote.creatorOpenId,
      deadline: targetVote.deadline
    });

    // 只有发起人可以删除
    if (targetVote.creatorOpenId !== OPENID) {
      console.log('权限不足! creatorOpenId:', targetVote.creatorOpenId, '!= OPENID:', OPENID);
      return { 
        success: false, 
        error: '无权限删除此活动', 
        debug: { 
          voteCreator: targetVote.creatorOpenId, 
          currentOpenId: OPENID,
          match: targetVote.creatorOpenId === OPENID
        } 
      };
    }

    // 删除主文档
    console.log('开始删除, 使用 _id:', actualId);
    try {
      await db.collection('schedule_votes').doc(actualId).remove();
      console.log('主文档删除成功');
    } catch (removeErr) {
      console.error('doc().remove 失败, 尝试 where+remove:', removeErr.message);
      // 如果 doc 删除失败，尝试用 where 批量删除
      try {
        await db.collection('schedule_votes').where({ _id: actualId }).remove();
        console.log('where remove 成功');
      } catch (whereRemoveErr) {
        console.error('where remove 也失败:', whereRemoveErr.message);
        return { success: false, error: '删除失败: ' + whereRemoveErr.message };
      }
    }

    // 删除关联记录（容错处理）
    for (const collName of ['schedule_vote_participants', 'schedule_vote_records']) {
      try {
        const { data: related } = await db.collection(collName)
          .where({ voteId: actualId })
          .limit(100)
          .get();
        
        if (related && related.length > 0) {
          console.log(`清理 ${collName}: ${related.length} 条`);
          for (const doc of related) {
            try {
              await db.collection(collName).doc(doc._id).remove();
            } catch (e) {
              console.log(`删除 ${collName}/${doc._id} 失败:`, e.message);
            }
          }
        }
      } catch (err) {
        console.log(`${collName} 集合不存在或已清空:`, err.message);
      }
    }

    return { 
      success: true, 
      message: '活动及其关联数据已彻底删除',
      deletedId: actualId
    };
  } catch (err) {
    console.error('deleteScheduleVote 异常:', err);
    return { success: false, error: err.message || '删除失败' };
  }
};
