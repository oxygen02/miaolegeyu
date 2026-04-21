const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { 
    title, 
    mode, 
    platform, 
    candidatePosters, 
    voteDeadline, 
    timeAuxiliary, 
    groupOrderOption 
  } = event;
  
  try {
    // 创建房间
    const roomData = {
      title,
      mode,
      platform: platform || '',
      creatorOpenId: wxContext.OPENID,
      status: 'voting',
      candidatePosters: candidatePosters || [],
      voteDeadline: voteDeadline ? new Date(voteDeadline) : new Date(Date.now() + 24 * 3600 * 1000),
      timeAuxiliary: timeAuxiliary || false,
      groupOrderOption: groupOrderOption || false,
      finalPoster: null,
      createdAt: db.serverDate(),
      lockedAt: null
    };
    
    const { _id } = await db.collection('rooms').add({
      data: roomData
    });
    
    // 创建发起人参与者记录
    await db.collection('participants').add({
      data: {
        roomId: _id,
        uuid: wxContext.OPENID,
        openid: wxContext.OPENID,
        status: 'opened',
        vote: null,
        hardTaboos: [],
        softTaboos: [],
        timeInfo: null,
        leaveInfo: null,
        orderItems: [],
        createdAt: db.serverDate()
      }
    });
    
    return { 
      code: 0, 
      data: { roomId: _id },
      msg: '创建成功'
    };
  } catch(e) { 
    return { 
      code: -1, 
      msg: e.message 
    };
  }
};
