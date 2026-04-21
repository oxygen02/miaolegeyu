const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;
  
  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms').doc(roomId).get();
    
    if (!roomResult.data) {
      return {
        code: -1,
        msg: '房间不存在'
      };
    }
    
    const room = roomResult.data;
    
    // 获取参与者列表
    const participantsResult = await db.collection('participants')
      .where({ roomId })
      .get();
    
    const participants = participantsResult.data || [];
    
    // 统计投票情况
    const votedCount = participants.filter(p => p.status === 'voted').length;
    const totalCount = participants.length;
    
    // 检查当前用户是否已投票
    const currentParticipant = participants.find(p => p.openid === wxContext.OPENID);
    const hasVoted = currentParticipant && currentParticipant.status === 'voted';
    
    return {
      code: 0,
      data: {
        ...room,
        participants: participants.map(p => ({
          ...p,
          // 隐藏openid，只返回是否已投票的状态
          hasVoted: p.status === 'voted'
        })),
        votedCount,
        totalCount,
        hasVoted,
        isCreator: room.creatorOpenId === wxContext.OPENID
      },
      msg: '获取成功'
    };
  } catch (e) {
    return {
      code: -1,
      msg: e.message
    };
  }
};
