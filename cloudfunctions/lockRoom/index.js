const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, finalPosterIndex, finalTime, finalAddress } = event;
  
  try {
    // 获取房间
    const roomResult = await db.collection('rooms').doc(roomId).get();
    
    if (!roomResult.data) {
      return { code: -1, msg: '房间不存在' };
    }
    
    const room = roomResult.data;
    
    // 检查权限（只有创建者可以锁定）
    if (room.creatorOpenId !== wxContext.OPENID) {
      return { code: -1, msg: '只有发起人才能锁定房间' };
    }
    
    // 检查房间状态
    if (room.status !== 'voting') {
      return { code: -1, msg: '房间已锁定或已取消' };
    }
    
    // 获取最终海报
    let finalPoster = null;
    if (finalPosterIndex !== undefined && room.candidatePosters && room.candidatePosters[finalPosterIndex]) {
      finalPoster = {
        ...room.candidatePosters[finalPosterIndex],
        time: finalTime ? new Date(finalTime) : null,
        address: finalAddress || ''
      };
    }
    
    // 更新房间状态
    await db.collection('rooms').doc(roomId).update({
      data: {
        status: 'locked',
        finalPoster,
        lockedAt: db.serverDate()
      }
    });
    
    return {
      code: 0,
      data: { roomId, status: 'locked' },
      msg: '房间已锁定'
    };
  } catch (e) {
    return { code: -1, msg: e.message };
  }
};
