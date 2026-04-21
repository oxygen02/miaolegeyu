const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { appointmentId, stars, comment } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!appointmentId || !stars) {
    return { success: false, error: '缺少必要参数' };
  }
  
  try {
    // 获取报名信息
    const appointment = await db.collection('dining_appointments').doc(appointmentId).get();
    
    if (!appointment.data) {
      return { success: false, error: '报名不存在' };
    }
    
    // 检查是否是发起者
    if (appointment.data.initiatorOpenId !== OPENID) {
      return { success: false, error: '只有发起者可以评价' };
    }
    
    // 更新评价
    await db.collection('dining_appointments').doc(appointmentId).update({
      data: {
        rating: {
          stars,
          comment: comment || '',
          ratingTime: new Date()
        },
        isCompleted: true
      }
    });
    
    return { 
      success: true, 
      message: '评价成功'
    };
  } catch (err) {
    console.error('评价失败:', err);
    return { success: false, error: err.message };
  }
};
