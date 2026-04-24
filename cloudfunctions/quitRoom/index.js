const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;
  
  if (!roomId) {
    return {
      code: -1,
      msg: '房间ID不能为空'
    };
  }
  
  try {
    // 检查用户是否参与了该房间
    const participantResult = await db.collection('room_participants')
      .where({
        roomId: roomId,
        openid: wxContext.OPENID
      })
      .get();
    
    if (participantResult.data.length === 0) {
      return {
        code: -1,
        msg: '您未参与该活动'
      };
    }
    
    const participant = participantResult.data[0];
    
    // 发起人不能退出，只能删除活动
    if (participant.role === 'creator') {
      return {
        code: -1,
        msg: '发起人不能退出，请使用删除功能'
      };
    }
    
    // 删除参与记录
    await db.collection('room_participants')
      .doc(participant._id)
      .remove();
    
    // 更新房间参与人数
    await db.collection('rooms')
      .where({ roomId })
      .update({
        data: {
          participantCount: db.command.inc(-1),
          updatedAt: db.serverDate()
        }
      });
    
    return {
      code: 0,
      msg: '退出成功'
    };
  } catch (err) {
    console.error('quitRoom error:', err);
    return {
      code: -1,
      msg: err.message || '退出失败'
    };
  }
};
