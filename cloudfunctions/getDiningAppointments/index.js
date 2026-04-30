const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { limit = 20, status = 'active', shopId } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    // 构建查询条件
    let whereClause = {};

    // 根据状态筛选
    if (status === 'active') {
      whereClause.status = 'active';
      whereClause.deadline = _.gte(new Date());
    } else if (status === 'completed') {
      whereClause.status = 'completed';
    }

    // 如果指定了店铺ID，添加店铺筛选
    if (shopId) {
      whereClause.shopId = shopId;
    }

    // 获取约饭活动
    const { data: appointments } = await db.collection('dining_appointments')
      .where(whereClause)
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
    const formattedAppointments = appointments.map(apt => {
      // 处理参与者数据
      const participants = apt.participants ? apt.participants.map(p => ({
        openId: p.openid || p.openId,
        name: p.name || '神秘喵友',
        avatar: p.avatar || ''
      })) : [];

      return {
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
        participantCount: participants.length,
        maxParticipants: apt.maxParticipants || 0,
        note: apt.note || '',
        paymentMode: apt.paymentMode || 'AA',
        createdAt: apt.createTime,
        creatorNickName: apt.initiatorName || '神秘喵友',
        creatorAvatarUrl: apt.initiatorAvatar || '',
        initiatorOpenId: apt.initiatorOpenId || '',
        participants: participants,
        isAppointment: true
      };
    });

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
