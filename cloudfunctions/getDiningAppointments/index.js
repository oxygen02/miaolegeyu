const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 敏感词库
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  // 其他违规
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

function containsSensitive(text) {
  if (!text) return false;
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) return true;
  }
  return false;
}

exports.main = async (event) => {
  const { limit = 100, status = 'active', shopId } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    // 构建查询条件
    let whereClause = {};

    const now = new Date();
    
    // 根据状态筛选
    if (status === 'active') {
      whereClause.status = 'active';
      // 过滤已过期的活动（截止时间大于当前时间）
      whereClause.deadline = _.gt(now);
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

    // 过滤违规内容
    const filteredAppointments = appointments.filter(apt => {
      const textToCheck = [apt.shopName, apt.initiatorName, apt.note].filter(Boolean).join(' ');
      if (containsSensitive(textToCheck)) {
        console.log('过滤违规约饭:', apt._id, apt.shopName);
        return false;
      }
      return true;
    });

    // 组装返回数据
    const formattedAppointments = filteredAppointments.map(apt => {
      // 处理参与者数据
      const participants = apt.participants ? apt.participants.map(p => ({
        openId: p.openid || p.openId,
        name: p.name || '神秘喵友',
        avatar: p.avatar || ''
      })) : [];

      // 获取店铺图片
      const shop = shopMap[apt.shopId] || {};
      const shopImage = shop.image || shop.coverImage || shop.posterImage || '';

      return {
        _id: apt._id,
        roomId: apt._id,
        title: apt.shopName || '约饭活动',
        status: 'voting',
        mode: 'meal',
        shopName: apt.shopName || '未知店铺',
        shopImage: shopImage,
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
