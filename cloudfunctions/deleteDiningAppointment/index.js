const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { appointmentId } = event;

  // 1. 校验登录态
  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  // 2. 参数校验
  if (!appointmentId) {
    return { code: -1, msg: '活动ID不能为空' };
  }

  try {
    // 3. 获取活动信息
    const appointmentResult = await db.collection('dining_appointments').doc(appointmentId).get();
    if (!appointmentResult.data) {
      return { code: -1, msg: '活动不存在' };
    }

    const appointment = appointmentResult.data;

    // 4. 权限校验：只有发起人可以删除
    if (appointment.initiatorOpenId !== wxContext.OPENID) {
      return { code: 403, msg: '只有发起人可以删除活动' };
    }

    // 5. 删除活动
    await db.collection('dining_appointments').doc(appointmentId).remove();

    return {
      code: 0,
      msg: '删除成功'
    };
  } catch (err) {
    console.error('deleteDiningAppointment error:', err);
    return {
      code: -1,
      msg: err.message || '删除失败'
    };
  }
};