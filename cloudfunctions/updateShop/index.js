const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { shopId, name, category, address, rating, tags, recommendedDishes, reason, tips, images } = event;
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
      return { success: false, error: '只有发起者可以修改店铺' };
    }
    
    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (address !== undefined) updateData.address = address;
    if (rating !== undefined) updateData.rating = rating;
    if (tags !== undefined) updateData.tags = tags;
    if (recommendedDishes !== undefined) updateData.recommendedDishes = recommendedDishes;
    if (reason !== undefined) updateData.reason = reason;
    if (tips !== undefined) updateData.tips = tips;
    if (images !== undefined) updateData.images = images;
    updateData.updateTime = new Date();
    
    // 更新店铺
    await db.collection('shops').doc(shopId).update({ data: updateData });
    
    return { 
      success: true, 
      message: '店铺更新成功' 
    };
  } catch (err) {
    console.error('更新店铺失败:', err);
    return { success: false, error: err.message };
  }
};
