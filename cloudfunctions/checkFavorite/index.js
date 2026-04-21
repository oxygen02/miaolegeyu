const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { targetId, type } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!targetId || !type) {
    return { success: false, error: '缺少必要参数' };
  }
  
  try {
    const favoriteRes = await db.collection('favorites')
      .where({
        openId: OPENID,
        targetId: targetId,
        type: type
      })
      .get();
    
    return { 
      success: true, 
      isFavorited: favoriteRes.data.length > 0
    };
  } catch (err) {
    console.error('检查收藏状态失败:', err);
    return { success: false, error: err.message };
  }
};
