const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { roomId } = event;
  
  try {
    // 获取所有已投票的参与者
    const { data: participants } = await db.collection('participants')
      .where({ roomId, status: 'voted' })
      .get();
    
    const posterStats = {}; // { 0: { likes: 0, vetoes: 0 }, ... }
    const hardTabooStats = {}; // 硬性禁忌统计
    const softTabooStats = {}; // 软性偏好统计
    
    participants.forEach(p => {
      const vote = p.vote || {};
      
      // 统计赞成票
      (vote.posterIndices || []).forEach(idx => {
        if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
        posterStats[idx].likes++;
      });
      
      // 统计否决票（硬性禁忌）
      (vote.vetoIndices || []).forEach(idx => {
        if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
        posterStats[idx].vetoes++;
      });
      
      // 统计禁忌
      (p.hardTaboos || []).forEach(taboo => {
        hardTabooStats[taboo] = (hardTabooStats[taboo] || 0) + 1;
      });
      
      (p.softTaboos || []).forEach(taboo => {
        softTabooStats[taboo] = (softTabooStats[taboo] || 0) + 1;
      });
    });
    
    // 过滤: vetoes > 0 的海报不参与排序（一票否决）
    const validPosters = Object.entries(posterStats)
      .filter(([idx, stat]) => stat.vetoes === 0)
      .sort((a, b) => b[1].likes - a[1].likes)
      .map(([idx, stat]) => ({ 
        index: parseInt(idx), 
        likes: stat.likes, 
        vetoes: stat.vetoes 
      }));
    
    // 被否决的海报
    const vetoedPosters = Object.entries(posterStats)
      .filter(([idx, stat]) => stat.vetoes > 0)
      .map(([idx, stat]) => ({ 
        index: parseInt(idx), 
        likes: stat.likes, 
        vetoes: stat.vetoes 
      }));
    
    // 获取房间信息
    const roomResult = await db.collection('rooms').doc(roomId).get();
    const room = roomResult.data;
    
    return {
      code: 0,
      data: {
        totalVoters: participants.length,
        validPosters,
        vetoedPosters,
        hardTabooStats,
        softTabooStats,
        candidatePosters: room.candidatePosters || []
      },
      msg: '统计成功'
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message
    };
  }
};
