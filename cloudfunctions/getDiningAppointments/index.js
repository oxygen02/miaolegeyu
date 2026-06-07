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
  const { limit = 100, status = 'active', shopId, shareCode = '' } = event;
  const { OPENID: currentOpenId } = cloud.getWXContext();

  try {
    const now = new Date();
    
    // 基础查询条件
    let baseWhereClause = {};
    
    // 根据状态筛选
    if (status === 'active') {
      baseWhereClause.status = 'active';
      baseWhereClause.deadline = _.gt(now);
    } else if (status === 'completed') {
      baseWhereClause.status = 'completed';
    }

    // 如果指定了店铺ID，添加店铺筛选
    if (shopId) {
      baseWhereClause.shopId = shopId;
    }

    // 如果有分享码，通过分享链查询
    if (shareCode) {
      return await queryByShareChain(shareCode, baseWhereClause);
    }

    // 获取当前用户信息（好友列表和城市）
    let userInfo = null;
    try {
      if (currentOpenId) {
        const { data: users } = await db.collection('users')
          .where({ _openid: currentOpenId })
          .limit(1)
          .field({
            friendOpenids: true,
            userCity: true
          })
          .get();
        
        if (users && users.length > 0) {
          userInfo = users[0];
        }
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }

    // 构建隐私过滤条件
    const privacyConditions = buildPrivacyConditions(currentOpenId, userInfo);

    // 合并基础条件和隐私条件
    const finalWhereClause = _.and([baseWhereClause, ...privacyConditions]);

    // 获取约饭活动
    const { data: appointments } = await db.collection('dining_appointments')
      .where(finalWhereClause)
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
        shopId: apt.shopId || '',
        title: apt.shopName || '约饭活动',
        status: 'voting',
        mode: 'meal',
        shopName: apt.shopName || '未知店铺',
        shopImage: shopImage,
        location: apt.shopName || '',
        appointmentTime: apt.appointmentTime, // 原始时间值（供前端格式化）
        activityTime: apt.appointmentTime ? apt.appointmentTime : '时间待定',
        deadline: apt.deadline ? apt.deadline : '',
        // 计算剩余时间（毫秒），供前端倒计时使用
        remainingTime: apt.deadline ? new Date(apt.deadline).getTime() - Date.now() : 0,
        participantCount: participants.length,
        maxParticipants: apt.maxParticipants || 0,
        note: apt.note || '',
        paymentMode: apt.paymentMode || '',
        createdAt: apt.createTime,
        creatorNickName: apt.initiatorName || '神秘喵友',
        creatorAvatarUrl: apt.initiatorAvatar || '',
        initiatorOpenId: apt.initiatorOpenId || '',
        initiatorName: apt.initiatorName || '神秘喵友',
        initiatorAvatar: apt.initiatorAvatar || '',
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

/**
 * 构建隐私过滤条件
 * 规则：
 * 1. 自己创建的活动始终可见
 * 2. 好友创建的活动可见
 * 3. 同城活动可见（如果用户设置了城市）
 */
function buildPrivacyConditions(currentOpenId, userInfo) {
  const friendOpenids = userInfo?.friendOpenids || [];
  const userCity = userInfo?.userCity?.city || '';

  // 条件1：自己创建的活动
  const myAppointments = { initiatorOpenId: currentOpenId };

  // 条件2：好友创建的活动
  const friendsAppointments = { initiatorOpenId: _.in(friendOpenids) };

  // 条件3：同城活动（如果用户设置了城市）
  let sameCityAppointments = null;
  if (userCity) {
    sameCityAppointments = { city: userCity };
  }

  // 组合条件：自己的 OR 好友的 OR 同城的
  const conditions = [myAppointments, friendsAppointments];
  if (sameCityAppointments) {
    conditions.push(sameCityAppointments);
  }

  return [_.or(conditions)];
}

/**
 * 通过分享链查询约饭活动
 */
async function queryByShareChain(shareCode, baseWhereClause) {
  try {
    // 查询分享链记录
    const { data: chains } = await db.collection('shareChains')
      .where({
        shareCode: shareCode,
        type: 'dining_appointment',  // 约饭活动类型
        expireTime: _.gt(new Date())
      })
      .limit(1)
      .get();

    if (!chains || chains.length === 0) {
      return {
        success: false,
        error: '分享链接已过期或不存在',
        appointments: []
      };
    }

    const chain = chains[0];
    
    // 查询被分享的约饭活动
    const { data: appointments } = await db.collection('dining_appointments')
      .where(_.and([
        baseWhereClause,
        { _id: chain.targetId }
      ]))
      .limit(1)
      .get();

    if (!appointments || appointments.length === 0) {
      return {
        success: false,
        error: '活动已结束或不存在',
        appointments: []
      };
    }

    // 记录访问信息（简化处理，实际需要组装完整数据）
    try {
      await db.collection('shareChains').doc(chain._id).update({
        data: {
          visitCount: _.inc(1),
          lastVisitTime: new Date()
        }
      });
    } catch (err) {
      console.error('更新分享链访问次数失败:', err);
    }

    return {
      success: true,
      appointments: appointments,
      isFromShare: true
    };
  } catch (err) {
    console.error('通过分享链查询约饭活动失败:', err);
    return {
      success: false,
      error: err.message,
      appointments: []
    };
  }
}
