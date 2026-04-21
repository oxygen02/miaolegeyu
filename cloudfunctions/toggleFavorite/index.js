const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { targetId, type } = event; // type: 'shop' | 'appointment'
  const { OPENID } = cloud.getWXContext();
  
  if (!targetId || !type) {
    return { success: false, error: '缺少必要参数' };
  }
  
  try {
    // 检查是否已收藏
    const favoriteRes = await db.collection('favorites')
      .where({
        openId: OPENID,
        targetId: targetId,
        type: type
      })
      .get();
    
    if (favoriteRes.data.length > 0) {
      // 已收藏，取消收藏
      await db.collection('favorites').doc(favoriteRes.data[0]._id).remove();
      return { 
        success: true, 
        isFavorited: false,
        message: '已取消收藏' 
      };
    } else {
      // 未收藏，添加收藏
      await db.collection('favorites').add({
        data: {
          openId: OPENID,
          targetId: targetId,
          type: type,
          createTime: new Date()
        }
      });
      return { 
        success: true, 
        isFavorited: true,
        message: '收藏成功' 
      };
    }
  } catch (err) {
    console.error('收藏操作失败:', err);
    return { success: false, error: err.message };
  }
};
