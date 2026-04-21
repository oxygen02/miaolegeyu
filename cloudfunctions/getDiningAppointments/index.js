const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { shopId } = event;
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
      .get();
    
    // 处理数据，添加是否已参加标记
    const appointments = result.data.map(item => ({
      ...item,
      isJoined: item.participants.some(p => p.openId === OPENID),
      participantCount: item.participants.length,
      remainingTime: new Date(item.deadline).getTime() - Date.now(),
      // 确保发起人信息存在
      initiatorName: item.initiatorName || '神秘喵友',
      initiatorAvatar: item.initiatorAvatar || ''
    }));
    
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
