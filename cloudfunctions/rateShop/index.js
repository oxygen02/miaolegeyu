const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { shopId, stars, comment } = event;
  const { OPENID } = cloud.getWXContext();

  if (!shopId || !stars) {
    return {
      success: false,
      error: '参数不完整'
    };
  }

  if (stars < 1 || stars > 5) {
    return {
      success: false,
      error: '评分必须在1-5之间'
    };
  }

  try {
    // 获取店铺信息
    const shopResult = await db.collection('shops').doc(shopId).get();
    if (!shopResult.data) {
      return {
        success: false,
        error: '店铺不存在'
      };
    }

    const shop = shopResult.data;

    // 检查用户是否是店铺推荐人
    if (shop.recommenderOpenId === OPENID) {
      return {
        success: false,
        error: '店铺推荐人无需重复评分'
      };
    }

    // 检查用户是否已经评分过
    const existingRating = await db.collection('shop_ratings').where({
      shopId: shopId,
      userOpenId: OPENID
    }).get();

    if (existingRating.data.length > 0) {
      return {
        success: false,
        error: '您已经评分过了'
      };
    }

    // 获取用户信息
    const userResult = await db.collection('users').where({
      _openid: OPENID
    }).get();
    
    const userInfo = userResult.data[0] || {};

    // 保存评分记录
    await db.collection('shop_ratings').add({
      data: {
        shopId: shopId,
        userOpenId: OPENID,
        userName: userInfo.nickName || '神秘喵友',
        userAvatar: userInfo.avatarUrl || '',
        stars: stars,
        comment: comment || '',
        createTime: db.serverDate()
      }
    });

    // 重新计算店铺综合评分
    const allRatings = await db.collection('shop_ratings').where({
      shopId: shopId
    }).get();

    const totalStars = allRatings.data.reduce((sum, r) => sum + r.stars, 0);
    const averageRating = ((shop.rating || 0) + totalStars) / (1 + allRatings.data.length);

    // 更新店铺评分
    await db.collection('shops').doc(shopId).update({
      data: {
        rating: Math.round(averageRating * 10) / 10,
        ratingCount: _.inc(1)
      }
    });

    return {
      success: true,
      message: '评价成功'
    };
  } catch (err) {
    console.error('评分失败:', err);
    return {
      success: false,
      error: err.message || '评分失败'
    };
  }
};
