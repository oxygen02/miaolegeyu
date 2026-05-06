const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { 
    appointmentId, 
    appointmentTime, 
    deadline, 
    note, 
    maxParticipants, 
    requirements, 
    customRequirement, 
    paymentMode 
  } = event;
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
      return { success: false, error: '只有发起者可以修改活动' };
    }
    
    // 构建更新数据
    const updateData = {};
    if (appointmentTime !== undefined) updateData.appointmentTime = new Date(appointmentTime);
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (note !== undefined) updateData.note = note;
    if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (customRequirement !== undefined) updateData.customRequirement = customRequirement;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    updateData.tzFixed = true;
    updateData.updateTime = new Date();
    
    // 更新活动
    await db.collection('dining_appointments').doc(appointmentId).update({ data: updateData });
    
    return { 
      success: true, 
      message: '活动更新成功' 
    };
  } catch (err) {
    console.error('更新活动失败:', err);
    return { success: false, error: err.message };
  }
};
