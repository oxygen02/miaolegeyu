const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type } = event; // type: 'shop' | 'appointment' | undefined(全部)
  const { OPENID } = cloud.getWXContext();
  
  try {
    let whereCondition = { openId: OPENID };
    if (type) {
      whereCondition.type = type;
    }
    
    // 获取收藏列表
    const favoriteRes = await db.collection('favorites')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .get();
    
    const favorites = favoriteRes.data;
    
    // 获取关联的详细信息
    const shopIds = favorites.filter(f => f.type === 'shop').map(f => f.targetId);
    const appointmentIds = favorites.filter(f => f.type === 'appointment').map(f => f.targetId);
    
    // 获取店铺信息
    let shops = [];
    if (shopIds.length > 0) {
      const shopRes = await db.collection('shops')
        .where({ _id: _.in(shopIds) })
        .get();
      shops = shopRes.data;
    }
    
    // 获取约饭活动信息
    let appointments = [];
    if (appointmentIds.length > 0) {
      const appointmentRes = await db.collection('dining_appointments')
        .where({ _id: _.in(appointmentIds) })
        .get();
      appointments = appointmentRes.data;
    }
    
    // 组装数据
    const result = favorites.map(f => {
      if (f.type === 'shop') {
        const shop = shops.find(s => s._id === f.targetId);
        return {
          ...f,
          shop: shop || null
        };
      } else if (f.type === 'appointment') {
        const appointment = appointments.find(a => a._id === f.targetId);
        return {
          ...f,
          appointment: appointment || null
        };
      }
      return f;
    });
    
    return { 
      success: true, 
      favorites: result,
      count: result.length
    };
  } catch (err) {
    console.error('获取收藏失败:', err);
    return { success: false, error: err.message };
  }
};
