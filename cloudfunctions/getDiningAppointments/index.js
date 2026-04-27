const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { limit = 20 } = event;
  const { OPENID } = cloud.getWXContext();
  
  try {
    // 获取所有进行中的约饭活动
    const { data: appointments } = await db.collection('dining_appointments')
      .where({
        status: 'active',
        deadline: _.gte(new Date())
      })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get();

    if (!appointments || appointments.length === 0) {
      return {
        success: true,
        appointments: []
      };
    }

    // 组装返回数据
    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      roomId: apt._id,
      title: apt.shopName || '约饭活动',
      status: 'voting',
      mode: 'meal',
      shopName: apt.shopName || '未知店铺',
      shopImage: '',
      location: apt.shopName || '',
      activityTime: apt.appointmentTime ? new Date(apt.appointmentTime).toLocaleString() : '时间待定',
      deadline: apt.deadline ? new Date(apt.deadline).toLocaleString() : '',
      participantCount: apt.participants ? apt.participants.length : 0,
      maxParticipants: apt.maxParticipants || 0,
      note: apt.note || '',
      paymentMode: apt.paymentMode || 'AA',
      createdAt: apt.createTime,
      creatorNickName: apt.initiatorName || '神秘喵友',
      creatorAvatarUrl: apt.initiatorAvatar || '',
      isAppointment: true
    }));

    return {
      success: true,
      appointments: formattedAppointments
    };
  } catch (err) {
    console.error('getDiningAppointments error:', err);
    return {
      success: false,
      error: err.message,
      appointments: []
    };
  }
};
