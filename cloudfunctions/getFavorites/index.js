const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  
  try {
    const favoriteRes = await db.collection('favorites')
      .where({ openId: OPENID })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();
    
    const favorites = favoriteRes.data || [];
    
    if (favorites.length === 0) {
      return { success: true, favorites: [], count: 0 };
    }
    
    const shopIds = favorites.filter(f => f.type === 'shop').map(f => f.targetId);
    const appointmentIds = favorites.filter(f => f.type === 'appointment').map(f => f.targetId);
    
    let shops = [];
    let appointments = [];
    
    if (shopIds.length > 0) {
      try {
        const shopRes = await db.collection('shops').where({ _id: _.in(shopIds) }).get();
        shops = shopRes.data || [];
      } catch (e) {
        console.warn('获取店铺信息失败:', e.message);
      }
    }
    
    if (appointmentIds.length > 0) {
      try {
        const appointmentRes = await db.collection('dining_appointments').where({ _id: _.in(appointmentIds) }).get();
        appointments = appointmentRes.data || [];
      } catch (e) {
        console.warn('获取约饭信息失败:', e.message);
      }
    }
    
    const shopMap = {};
    shops.forEach(s => { shopMap[s._id] = s; });
    const appointmentMap = {};
    appointments.forEach(a => { appointmentMap[a._id] = a; });
    
    const result = favorites.map(f => {
      if (f.type === 'shop') {
        return { ...f, shop: shopMap[f.targetId] || null };
      } else if (f.type === 'appointment') {
        return { ...f, appointment: appointmentMap[f.targetId] || null };
      }
      return f;
    });
    
    return { success: true, favorites: result, count: result.length };
  } catch (err) {
    console.error('getFavorites error:', err);
    return { success: true, favorites: [], count: 0, error: err.message };
  }
};
