const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { status = 'all' } = event; // all, active, locked
  
  try {
    // 构建查询条件
    let whereCondition = {};
    if (status === 'active' || status === 'voting') {
      whereCondition.status = 'voting';
    } else if (status === 'locked') {
      whereCondition.status = 'locked';
    }
    
    // 获取所有房间
    const { data: rooms } = await db.collection('rooms')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .get();
    
    // 按发起人分组
    const creatorGroups = {};
    
    rooms.forEach(room => {
      const creatorId = room.creatorOpenId || 'unknown';
      
      if (!creatorGroups[creatorId]) {
        creatorGroups[creatorId] = {
          creatorId: creatorId,
          creatorName: room.creatorName || '神秘喵友',
          creatorAvatar: room.creatorAvatar || '',
          rooms: []
        };
      }
      
      creatorGroups[creatorId].rooms.push({
        roomId: room.roomId,
        title: room.title,
        status: room.status,
        activityDate: room.activityDate,
        activityTime: room.activityTime,
        location: room.location,
        createdAt: room.createdAt,
        voteDeadline: room.voteDeadline,
        finalPoster: room.finalPoster,
        candidatePosters: room.candidatePosters || []
      });
    });
    
    // 转换为数组
    const groupedRooms = Object.values(creatorGroups);
    
    return {
      code: 0,
      data: groupedRooms,
      msg: '获取成功'
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message
    };
  }
};
