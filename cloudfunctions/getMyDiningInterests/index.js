const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    const { result } = await db.collection('shop_dining_interests')
      .where({
        openId: OPENID
      })
      .orderBy('createTime', 'desc')
      .get();

    // 提取所有店铺ID
    const shopIds = result.data.map(item => item.shopId);

    return {
      success: true,
      interests: result.data,
      shopIds: shopIds
    };
  } catch (err) {
    console.error('获取约饭意向失败:', err);
    return { success: false, error: err.message };
  }
};