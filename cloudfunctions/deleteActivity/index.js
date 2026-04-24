const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { activityId, type } = event;
  
  if (!activityId) {
    return {
      code: -1,
      msg: '活动ID不能为空'
    };
  }
  
  try {
    // 根据类型删除不同的记录
    if (type === 'my') {
      // 删除我发起的活动（房间）
      // 1. 检查是否是创建者
      const roomResult = await db.collection('rooms')
        .where({
          roomId: activityId,
          creatorOpenId: wxContext.OPENID
        })
        .get();
      
      if (roomResult.data.length === 0) {
        return {
          code: -1,
          msg: '无权删除此活动'
        };
      }
      
      // 2. 删除房间
      await db.collection('rooms')
        .where({ roomId: activityId })
        .remove();
      
      // 3. 删除相关参与者记录
      await db.collection('room_participants')
        .where({ roomId: activityId })
        .remove();
      
    } else if (type === 'ongoing' || type === 'history') {
      // 删除参与记录（退出活动）
      await db.collection('room_participants')
        .where({
          roomId: activityId,
          openid: wxContext.OPENID
        })
        .remove();
    }
    
    return {
      code: 0,
      msg: '删除成功',
      success: true
    };
  } catch (err) {
    console.error('deleteActivity error:', err);
    return {
      code: -1,
      msg: err.message || '删除失败'
    };
  }
};
