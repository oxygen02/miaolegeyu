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
    // 获取房间信息（通过roomId字段查询）
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();
    
    if (!roomResult.data || roomResult.data.length === 0) {
      return {
        code: -1,
        msg: '房间不存在'
      };
    }
    
    const room = roomResult.data[0];
    console.log('房间原始数据:', room);
    console.log('海报数据:', room.candidatePosters);
    
    // 获取参与者列表（只获取必要字段）
    let participants = [];
    try {
      const participantsResult = await db.collection('room_participants')
        .where({ roomId })
        .field({
          openid: true,
          status: true,
          likedIndices: true,
          vetoedIndices: true,
          joinedAt: true
        })
        .get();
      participants = participantsResult.data || [];
    } catch (err) {
      console.error('获取参与者失败:', err);
    }
    
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
          status: p.status,
          hasVoted: p.status === 'voted',
          joinedAt: p.joinedAt
        })),
        votedCount,
        totalCount,
        hasVoted,
        isCreator: room.creatorOpenId === wxContext.OPENID
      },
      msg: '获取成功'
    };
  } catch (e) {
    console.error('getRoom error:', e);
    return {
      code: -1,
      msg: e.message || '获取房间信息失败'
    };
  }
};
