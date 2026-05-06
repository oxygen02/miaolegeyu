const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { limit = 100, status = 'active', shopId } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    // 构建查询条件
    let whereClause = {};

    // 根据状态筛选
    if (status === 'active') {
      whereClause.status = 'active';
      // 暂时不过滤截止时间，显示所有活动
      // whereClause.deadline = _.gte(new Date());
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

    // 获取所有店铺ID
    const shopIds = appointments.map(apt => apt.shopId).filter(id => id);
    let shopMap = {};
    
    // 如果有店铺ID，查询店铺信息获取图片
    if (shopIds.length > 0) {
      try {
        const { data: shops } = await db.collection('shops')
          .where({ _id: _.in(shopIds) })
          .get();
        
        shopMap = shops.reduce((map, shop) => {
          map[shop._id] = shop;
          return map;
        }, {});
      } catch (shopErr) {
        console.error('获取店铺信息失败:', shopErr);
      }
    }

    // 组装返回数据
    const formattedAppointments = appointments.map(apt => {
      // 处理参与者数据
      const participants = apt.participants ? apt.participants.map(p => ({
        openId: p.openid || p.openId,
        name: p.name || '神秘喵友',
        avatar: p.avatar || ''
      })) : [];

      // 获取店铺图片
      const shop = shopMap[apt.shopId] || {};
      const shopImage = shop.image || shop.coverImage || shop.posterImage || '';

      // 将云数据库 Date 类型转换为 ISO 字符串，确保前端能正确解析
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
        _id: apt._id,
        roomId: apt._id,
        title: apt.shopName || '约饭活动',
        status: 'voting',
        mode: 'meal',
        shopId: apt.shopId || '',
        shopName: apt.shopName || '未知店铺',
        shopImage: shopImage,
        location: apt.shopName || '',
        appointmentTime: appointmentTimeStr,
        activityTime: appointmentTimeStr ? new Date(appointmentTimeStr).toLocaleString() : '时间待定',
        deadline: deadlineStr,
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
