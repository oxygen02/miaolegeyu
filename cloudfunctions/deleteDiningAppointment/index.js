const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { appointmentId } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!appointmentId) {
    return { success: false, error: '缺少活动ID' };
  }
  
  try {
    // 获取活动信息，检查是否是发起者
    const appointmentRes = await db.collection('dining_appointments').doc(appointmentId).get();
    
    if (!appointmentRes.data) {
      return { success: false, error: '活动不存在' };
    }
    
    if (appointmentRes.data.initiatorOpenId !== OPENID) {
      return { success: false, error: '只有发起者可以删除活动' };
    }
    
    // 删除活动
    await db.collection('dining_appointments').doc(appointmentId).remove();
    
    // 删除相关的收藏
    await db.collection('favorites')
      .where({ targetId: appointmentId, type: 'appointment' })
      .remove();
    
    return { 
      success: true, 
      message: '活动删除成功' 
    };
  } catch (err) {
    console.error('删除活动失败:', err);
    return { success: false, error: err.message };
  }
};
