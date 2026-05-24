const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { roomId } = event;
  const wxContext = cloud.getWXContext();
  
  if (!wxContext.OPENID) {
    return { code: -1, msg: '未登录' };
  }
  
  if (!roomId) {
    return { code: -1, msg: '房间号不能为空' };
  }
  
  try {
    // 查找房间
    const roomRes = await db.collection('rooms').where({ roomId }).get();
    
    if (roomRes.data.length === 0) {
      // 尝试在 dining_appointments 中查找
      const diningRes = await db.collection('dining_appointments').where({ _id: roomId }).get();
      if (diningRes.data.length > 0) {
        await db.collection('dining_appointments').doc(roomId).remove();
        return { code: 0, msg: '约饭活动已删除' };
      }
      
      // 尝试在 schedule_votes 中查找
      const voteRes = await db.collection('schedule_votes').where({ _id: roomId }).get();
      if (voteRes.data.length > 0) {
        await db.collection('schedule_votes').doc(roomId).remove();
        return { code: 0, msg: '投票活动已删除' };
      }
      
      return { code: -1, msg: '活动不存在' };
    }
    
    const room = roomRes.data[0];
    
    // 删除房间
    await db.collection('rooms').doc(room._id).remove();
    
    // 删除相关参与者记录
    await db.collection('room_participants').where({ roomId }).remove();
    
    return {
      code: 0,
      msg: '活动已删除',
      data: { roomId, title: room.title }
    };
    
  } catch (err) {
    console.error('删除活动失败:', err);
    return { code: -1, msg: '删除失败: ' + err.message };
  }
};
