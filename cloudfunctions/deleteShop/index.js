const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { shopId } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!shopId) {
    return { success: false, error: '缺少店铺ID' };
  }
  
  try {
    // 获取店铺信息，检查是否是发起者
    const shopRes = await db.collection('shops').doc(shopId).get();
    
    if (!shopRes.data) {
      return { success: false, error: '店铺不存在' };
    }
    
    if (shopRes.data.recommenderOpenId !== OPENID) {
      return { success: false, error: '只有发起者可以删除店铺' };
    }
    
    // 删除店铺
    await db.collection('shops').doc(shopId).remove();
    
    // 删除相关的收藏
    await db.collection('favorites')
      .where({ targetId: shopId, type: 'shop' })
      .remove();
    
    return { 
      success: true, 
      message: '店铺删除成功' 
    };
  } catch (err) {
    console.error('删除店铺失败:', err);
    return { success: false, error: err.message };
  }
};
