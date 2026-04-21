const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  
  try {
    const appointmentRes = await db.collection('dining_appointments')
      .where({ initiatorOpenId: OPENID })
      .orderBy('createTime', 'desc')
      .get();
    
    return { 
      success: true, 
      appointments: appointmentRes.data,
      count: appointmentRes.data.length
    };
  } catch (err) {
    console.error('获取我的活动失败:', err);
    return { success: false, error: err.message };
  }
};
