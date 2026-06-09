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
    const isCreator = participant.role === 'creator';

    // 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).get();
    const room = roomResult.data[0];

    // 删除参与记录
    await db.collection('room_participants')
      .doc(participant._id)
      .remove();

    // 如果是发起人退出，且还有其他参与者，才转移发起人身份
    // 发起人自己退出时保留 creatorOpenId 不变，方便重新进入
    if (isCreator && room) {
      const otherParticipants = await db.collection('room_participants')
        .where({ roomId, openid: db.command.neq(wxContext.OPENID) })
        .limit(1)
        .get();

      if (otherParticipants.data.length > 0) {
        // 有其他参与者时，将发起人身份转移给第一个其他参与者
        await db.collection('room_participants')
          .doc(otherParticipants.data[0]._id)
          .update({ data: { role: 'creator' } });

        // 更新房间的 creatorOpenId（仅在有接替者时转移）
        await db.collection('rooms')
          .where({ roomId })
          .update({
            data: {
              creatorOpenId: otherParticipants.data[0].openid,
              updatedAt: db.serverDate()
            }
          });
      }
      // 注意：没有其他参与者时，不修改 creatorOpenId
      // 原创建者可以随时重新进入活动
    }

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
