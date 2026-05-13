const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { shopId, name, cuisine, cuisineName, avgPrice, location, reason, tips, platformUrl, rating, images, isAnonymous } = event;
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

    if (shopRes.data.openid !== OPENID) {
      return { success: false, error: '只有发起者可以修改店铺' };
    }

    // 构建更新数据
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (cuisine !== undefined) updateData.cuisine = cuisine;
    if (cuisineName !== undefined) updateData.cuisineName = cuisineName;
    if (avgPrice !== undefined) updateData.avgPrice = parseInt(avgPrice) || 0;
    if (location !== undefined) updateData.location = location;
    if (reason !== undefined) updateData.reason = reason;
    if (tips !== undefined) updateData.tips = tips;
    if (platformUrl !== undefined) updateData.platformUrl = platformUrl;
    if (rating !== undefined) updateData.rating = parseInt(rating) || 3;
    if (images !== undefined) updateData.images = images;
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
    updateData.updateTime = db.serverDate();

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
