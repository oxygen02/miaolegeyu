const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { shopId, limit = 5 } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    let query = db.collection('dining_appointments')
      .where({
        status: 'active',
        deadline: db.command.gt(new Date())
      });

    if (shopId) {
      query = query.where({ shopId });
    }

    const result = await query
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    // 获取所有店铺ID
    const shopIds = [...new Set(result.data.map(item => item.shopId))];

    // 批量获取店铺信息
    const shopInfoMap = {};
    if (shopIds.length > 0) {
      const shopResult = await db.collection('shops')
        .where({
          _id: _.in(shopIds)
        })
        .get();

      shopResult.data.forEach(shop => {
        shopInfoMap[shop._id] = {
          name: shop.name,
          location: shop.location,
          address: shop.address,
          cuisine: shop.cuisine,
          cuisineName: shop.cuisineName,
          images: shop.images
        };
      });
    }

    // 处理数据，添加是否已参加标记和店铺信息
    const appointments = result.data.map(item => {
      const shopInfo = shopInfoMap[item.shopId] || {};
      return {
        ...item,
        isJoined: item.participants.some(p => p.openId === OPENID),
        participantCount: item.participants.length,
        remainingTime: new Date(item.deadline).getTime() - Date.now(),
        // 确保发起人信息存在
        initiatorName: item.initiatorName || '神秘喵友',
        initiatorAvatar: item.initiatorAvatar || '',
        // 添加店铺信息
        shopName: shopInfo.name || item.shopName || '未知店铺',
        shopLocation: shopInfo.location || item.shopLocation || '地址待定',
        shopAddress: shopInfo.address || item.shopAddress || '',
        cuisine: shopInfo.cuisine || item.cuisine || '',
        cuisineName: shopInfo.cuisineName || item.cuisineName || '美食',
        shopImages: shopInfo.images || item.shopImages || []
      };
    });

    return {
      success: true,
      appointments,
      count: appointments.length
    };
  } catch (err) {
    console.error('获取约饭报名失败:', err);
    return { success: false, error: err.message };
  }
};
