const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { roomId, selectedOptionIndex, note = '' } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!roomId || selectedOptionIndex === undefined) {
    return {
      code: -1,
      msg: '参数错误'
    };
  }
  
  try {
    // 获取房间信息
    const { data: rooms } = await db.collection('rooms')
      .where({ roomId })
      .get();
    
    if (!rooms || rooms.length === 0) {
      return {
        code: -1,
        msg: '房间不存在'
      };
    }
    
    const room = rooms[0];
    
    // 检查房间状态
    if (room.status !== 'voting') {
      return {
        code: -1,
        msg: '拼单已结束'
      };
    }
    
    // 检查是否已参与
    const { data: existingParticipants } = await db.collection('group_order_participants')
      .where({
        roomId,
        openid: OPENID
      })
      .get();
    
    if (existingParticipants && existingParticipants.length > 0) {
      // 更新选择
      await db.collection('group_order_participants').doc(existingParticipants[0]._id).update({
        data: {
          selectedOptionIndex,
          note,
          updatedAt: db.serverDate()
        }
      });
      
      return {
        code: 0,
        msg: '更新成功',
        isUpdate: true
      };
    }
    
    // 添加新的参与记录
    await db.collection('group_order_participants').add({
      data: {
        roomId,
        openid: OPENID,
        selectedOptionIndex,
        note,
        joinedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
    
    return {
      code: 0,
      msg: '参与成功',
      isUpdate: false
    };
    
  } catch (err) {
    console.error('joinGroupOrder error:', err);
    return {
      code: -1,
      msg: err.message || '参与失败'
    };
  }
};
