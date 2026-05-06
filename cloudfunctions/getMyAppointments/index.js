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

    const appointments = appointmentRes.data.map(apt => {
      // 旧数据（没有 tzFixed 标记）被服务端当作 UTC 存储，实际应为东八区，需减 8 小时修正
      let appointmentTimeStr = '';
      if (apt.appointmentTime) {
        const d = new Date(apt.appointmentTime);
        if (!apt.tzFixed) { d.setHours(d.getHours() - 8); }
        appointmentTimeStr = d.toISOString();
      }
      let deadlineStr = '';
      if (apt.deadline) {
        const d = new Date(apt.deadline);
        if (!apt.tzFixed) { d.setHours(d.getHours() - 8); }
        deadlineStr = d.toISOString();
      }

      return {
        ...apt,
        appointmentTime: appointmentTimeStr,
        deadline: deadlineStr
      };
    });

    return {
      success: true,
      appointments: appointments,
      count: appointments.length
    };
  } catch (err) {
    console.error('获取我的活动失败:', err);
    return { success: false, error: err.message };
  }
};
