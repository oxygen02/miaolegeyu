const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 清理过期数据云函数（增强版）
 * 
 * 清理规则：
 * 1. 房间（rooms）：已结束超过30天的活动
 * 2. 约饭活动（dining_appointments）：已结束超过30天
 * 3. 拼单参与者记录：关联的房间已删除
 * 4. 分享链记录：已过期的分享链接
 * 5. 投票记录：关联的房间已删除
 * 
 * 定时触发器配置：
 * - 触发频率：每天凌晨3点执行
 * - 每次处理数量限制，避免超时
 */
exports.main = async (event) => {
  const now = new Date();
  
  // 计算30天前的日期
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  let stats = {
    deletedRooms: 0,
    deletedDiningAppointments: 0,
    deletedParticipants: 0,
    deletedGroupOrderParticipants: 0,
    deletedVotes: 0,
    deletedShareChains: 0,
    errors: []
  };
  
  console.log('开始清理过期数据，当前时间:', now.toISOString());
  console.log('清理30天前的数据，截止时间:', thirtyDaysAgo.toISOString());

  try {
    // ========== 1. 清理过期的房间 ==========
    await cleanupRooms(thirtyDaysAgo, stats);

    // ========== 2. 清理过期的约饭活动 ==========
    await cleanupDiningAppointments(thirtyDaysAgo, stats);

    // ========== 3. 清理孤立的拼单参与者记录 ==========
    await cleanupOrphanedGroupParticipants(stats);

    // ========== 4. 清理过期的分享链记录 ==========
    await cleanupExpiredShareChains(now, stats);

    console.log('清理完成，统计:', JSON.stringify(stats));

    return {
      code: 0,
      msg: '清理完成',
      stats,
      executeTime: now.toISOString()
    };

  } catch (err) {
    console.error('cleanupExpiredData error:', err);
    return {
      code: -1,
      msg: err.message || '清理失败',
      stats
    };
  }
};

/**
 * 清理过期的房间及其关联数据
 */
async function cleanupRooms(thirtyDaysAgo, stats) {
  try {
    // 查找已结束超过30天的房间
    // 条件：状态不是 'voting' 且创建时间或截止时间在30天前
    const expiredRooms = await db.collection('rooms')
      .where(_.or([
        // 已完成且超过30天
        _.and([
          { status: _.in(['completed', 'cancelled', 'expired']) },
          { updatedAt: _.lt(thirtyDaysAgo) }
        ]),
        // 投票已截止且超过30天
        _.and([
          { voteDeadline: _.lt(thirtyDaysAgo) },
          { status: _.neq('voting') }
        ])
      ]))
      .limit(100)
      .field({ _id: true, roomId: true })
      .get();

    if (!expiredRooms.data || expiredRooms.data.length === 0) {
      console.log('没有需要清理的过期房间');
      return;
    }

    console.log(`发现 ${expiredRooms.data.length} 个过期房间`);

    for (const room of expiredRooms.data) {
      try {
        const roomId = room.roomId;
        
        // 使用事务确保数据一致性
        const transaction = await db.startTransaction();
        
        try {
          // 删除房间的参与者记录
          const participantsResult = await transaction.collection('room_participants')
            .where({ roomId })
            .remove();
          
          // 删除房间的投票记录
          const votesResult = await transaction.collection('votes')
            .where({ roomId })
            .remove();

          // 删除拼单参与者记录
          const groupResult = await transaction.collection('group_order_participants')
            .where({ roomId })
            .remove();
          
          // 删除房间本身
          await transaction.collection('rooms')
            .doc(room._id)
            .remove();
          
          await transaction.commit();
          
          stats.deletedRooms++;
          stats.deletedParticipants += participantsResult.stats?.removed || 0;
          stats.deletedVotes += votesResult.stats?.removed || 0;
          stats.deletedGroupOrderParticipants += groupResult.stats?.removed || 0;
          
          console.log(`已清理房间 ${roomId}`);
          
        } catch (err) {
          await transaction.rollback();
          throw err;
        }

      } catch (err) {
        console.error(`清理房间 ${room.roomId} 失败:`, err);
        stats.errors.push({
          type: 'room',
          id: room.roomId,
          error: err.message
        });
      }
    }

  } catch (err) {
    console.error('清理房间失败:', err);
    stats.errors.push({
      type: 'room_batch',
      error: err.message
    });
  }
}

/**
 * 清理过期的约饭活动
 */
async function cleanupDiningAppointments(thirtyDaysAgo, stats) {
  try {
    // 查找已结束或已过期且超过30天的约饭活动
    const expiredAppointments = await db.collection('dining_appointments')
      .where(_.or([
        // 已完成且超过30天
        _.and([
          { status: 'completed' },
          { createTime: _.lt(thirtyDaysAgo) }
        ]),
        // 已过期（deadline已过）且超过30天
        _.and([
          { deadline: _.lt(thirtyDaysAgo) },
          { status: _.neq('active') }
        ])
      ]))
      .limit(100)
      .field({ _id: true })
      .get();

    if (!expiredAppointments.data || expiredAppointments.data.length === 0) {
      console.log('没有需要清理的过期约饭活动');
      return;
    }

    console.log(`发现 ${expiredAppointments.data.length} 个过期约饭活动`);

    for (const apt of expiredAppointments.data) {
      try {
        await db.collection('dining_appointments').doc(apt._id).remove();
        stats.deletedDiningAppointments++;
        
      } catch (err) {
        console.error(`清理约饭活动 ${apt._id} 失败:`, err);
        stats.errors.push({
          type: 'dining_appointment',
          id: apt._id,
          error: err.message
        });
      }
    }

  } catch (err) {
    console.error('清理约饭活动失败:', err);
    stats.errors.push({
      type: 'dining_appointment_batch',
      error: err.message
    });
  }
}

/**
 * 清理孤立的拼单参与者记录（房间已被删除）
 */
async function cleanupOrphanedGroupParticipants(stats) {
  try {
    // 获取所有现有的房间ID
    const { data: rooms } = await db.collection('rooms')
      .field({ roomId: true })
      .limit(1000)
      .get();
    
    const validRoomIds = new Set((rooms || []).map(r => r.roomId));
    
    // 查找所有拼单参与者记录
    const { data: allParticipants } = await db.collection('group_order_participants')
      .limit(500)
      .field({ _id: true, roomId: true })
      .get();

    if (!allParticipants || allParticipants.length === 0) {
      return;
    }

    // 找出孤立的记录
    const orphanedRecords = allParticipants.filter(p => !validRoomIds.has(p.roomId));
    
    if (orphanedRecords.length === 0) {
      console.log('没有孤立的拼单参与者记录');
      return;
    }

    console.log(`发现 ${orphanedRecords.length} 条孤立的拼单参与者记录`);

    for (const record of orphanedRecords) {
      try {
        await db.collection('group_order_participants').doc(record._id).remove();
        stats.deletedGroupOrderParticipants++;

      } catch (err) {
        console.error(`删除孤立记录 ${record._id} 失败:`, err);
        stats.errors.push({
          type: 'orphaned_participant',
          id: record._id,
          error: err.message
        });
      }
    }

  } catch (err) {
    console.error('清理孤立记录失败:', err);
    stats.errors.push({
      type: 'orphaned_batch',
      error: err.message
    });
  }
}

/**
 * 清理过期的分享链记录
 */
async function cleanupExpiredShareChains(now, stats) {
  try {
    // 查找已过期的分享链
    const expiredChains = await db.collection('shareChains')
      .where({
        expireTime: _.lt(now)
      })
      .limit(200)
      .field({ _id: true, shareCode: true })
      .get();

    if (!expiredChains.data || expiredChains.data.length === 0) {
      console.log('没有需要清理的过期分享链');
      return;
    }

    console.log(`发现 ${expiredChains.data.length} 个过期分享链`);

    for (const chain of expiredChains.data) {
      try {
        await db.collection('shareChains').doc(chain._id).remove();
        stats.deletedShareChains++;

      } catch (err) {
        console.error(`删除分享链 ${chain.shareCode} 失败:`, err);
        stats.errors.push({
          type: 'share_chain',
          id: chain.shareCode,
          error: err.message
        });
      }
    }

  } catch (err) {
    console.error('清理分享链失败:', err);
    stats.errors.push({
      type: 'share_chain_batch',
      error: err.message
    });
  }
}
