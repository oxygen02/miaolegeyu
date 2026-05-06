const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { appointmentId } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!appointmentId) {
    return { success: false, error: '缺少报名ID' };
  }
  
  try {
    // 获取报名信息
    const appointment = await db.collection('dining_appointments').doc(appointmentId).get();
    
    if (!appointment.data) {
      return { success: false, error: '报名不存在' };
    }
    
    const data = appointment.data;

    // 检查是否已截止（旧数据需减8小时修正时区偏差）
    let deadline = new Date(data.deadline);
    if (!data.tzFixed) {
      deadline = new Date(deadline.getTime() - 8 * 60 * 60 * 1000);
    }
    if (deadline < new Date()) {
      return { success: false, error: '报名已截止' };
    }
    
    // 检查是否已参加
    const isAlreadyJoined = data.participants.some(p => p.openId === OPENID);
    if (isAlreadyJoined) {
      return { success: false, error: '您已经参加啦' };
    }
    
    // 添加参与者（不依赖 users 集合）
    await db.collection('dining_appointments').doc(appointmentId).update({
      data: {
        participants: _.push({
          openId: OPENID,
          name: '神秘喵友',
          avatar: '',
          joinTime: new Date()
        })
      }
    });
    
    return { 
      success: true, 
      message: '参加成功',
      participantCount: data.participants.length + 1
    };
  } catch (err) {
    console.error('参加约饭失败:', err);
    return { success: false, error: err.message };
  }
};
