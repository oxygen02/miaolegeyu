const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  
  try {
    const shopRes = await db.collection('shops')
      .where({ recommenderOpenId: OPENID })
      .orderBy('createTime', 'desc')
      .get();
    
    return { 
      success: true, 
      shops: shopRes.data,
      count: shopRes.data.length
    };
  } catch (err) {
    console.error('获取我的店铺失败:', err);
    return { success: false, error: err.message };
  }
};
