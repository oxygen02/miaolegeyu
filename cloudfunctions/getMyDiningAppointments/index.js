const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    const { data: appointments } = await db.collection('dining_appointments')
      .where({
        initiatorOpenId: OPENID
      })
      .orderBy('createTime', 'desc')
      .limit(100)
      .get();

    // 获取所有店铺ID
    const shopIds = appointments.map(apt => apt.shopId).filter(id => id);
    let shopMap = {};
    
    // 如果有店铺ID，查询店铺信息获取图片
    if (shopIds.length > 0) {
      try {
        const { data: shops } = await db.collection('shops')
          .where({ _id: _.in(shopIds) })
          .get();
        
        shopMap = shops.reduce((map, shop) => {
          map[shop._id] = shop;
          return map;
        }, {});
      } catch (shopErr) {
        console.error('获取店铺信息失败:', shopErr);
      }
    }

    // 补充店铺图片
    const formattedAppointments = appointments.map(apt => {
      const shop = shopMap[apt.shopId] || {};
      return {
        ...apt,
        shopImage: shop.image || shop.coverImage || shop.posterImage || ''
      };
    });

    return {
      success: true,
      appointments: formattedAppointments
    };
  } catch (err) {
    console.error('获取我的约饭活动失败:', err);
    return { success: false, error: err.message };
  }
};