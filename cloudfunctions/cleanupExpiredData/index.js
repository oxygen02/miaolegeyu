const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 清理过期数据云函数
 * - 清理过期的房间（30天未活动）
 * - 清理关联的参与者记录
 * - 清理关联的投票记录
 * - 清理过期的用户投票状态缓存
 */
exports.main = async (event) => {
  const now = new Date();
  let stats = {
    deletedRooms: 0,
    deletedParticipants: 0,
    deletedVotes: 0,
    errors: []
  };
  
  try {
    // 1. 查找过期的房间
    const expiredRooms = await db.collection('rooms')
      .where({
        expireAt: _.lt(now)
      })
      .limit(100) // 每次最多处理100个房间
      .get();
    
    if (expiredRooms.data.length === 0) {
      return {
        code: 0,
        msg: '没有需要清理的过期数据',
        stats
      };
    }
    
    console.log(`发现 ${expiredRooms.data.length} 个过期房间`);
    
    // 2. 批量删除过期房间及相关数据
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
          
          // 删除房间本身
          await transaction.collection('rooms')
            .doc(room._id)
            .remove();
          
          await transaction.commit();
          
          stats.deletedRooms++;
          stats.deletedParticipants += participantsResult.stats?.removed || 0;
          stats.deletedVotes += votesResult.stats?.removed || 0;
          
          console.log(`已清理房间 ${roomId}`);
          
        } catch (err) {
          await transaction.rollback();
          throw err;
        }
        
      } catch (err) {
        console.error(`清理房间 ${room.roomId} 失败:`, err);
        stats.errors.push({
          roomId: room.roomId,
          error: err.message
        });
      }
    }
    
    return {
      code: 0,
      msg: '清理完成',
      stats
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
