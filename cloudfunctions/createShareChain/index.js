const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 创建分享链记录
 * 
 * @param {string} targetId - 被分享的内容ID（房间ID或约饭活动ID）
 * @param {string} type - 类型：'room' | 'dining_appointment'
 * @param {number} expireHours - 有效期（小时），默认24小时
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { targetId, type = 'room', expireHours = 24 } = event;

  // 检查用户登录态
  if (!wxContext.OPENID) {
    return {
      success: false,
      error: '用户未登录',
      shareCode: null
    };
  }

  if (!targetId) {
    return {
      success: false,
      error: '缺少目标ID',
      shareCode: null
    };
  }

  try {
    // 验证目标内容是否存在
    let targetExists = false;
    
    if (type === 'room') {
      const { data: rooms } = await db.collection('rooms')
        .where({ roomId: targetId })
        .limit(1)
        .get();
      targetExists = rooms && rooms.length > 0;
    } else if (type === 'dining_appointment') {
      const { data: appointments } = await db.collection('dining_appointments')
        .where({ _id: targetId })
        .limit(1)
        .get();
      targetExists = appointments && appointments.length > 0;
    }

    if (!targetExists) {
      return {
        success: false,
        error: '目标内容不存在',
        shareCode: null
      };
    }

    // 生成唯一分享码（使用时间戳 + 随机数）
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    const shareCode = `${type}_${timestamp}_${randomStr}`;

    // 计算过期时间
    const expireTime = new Date(Date.now() + expireHours * 60 * 60 * 1000);

    // 创建分享链记录
    const chainData = {
      shareCode,
      type,
      targetId,
      creatorOpenId: wxContext.OPENID,
      createTime: new Date(),
      expireTime,
      visitCount: 0,
      lastVisitTime: null
    };

    const result = await db.collection('shareChains').add({
      data: chainData
    });

    console.log('创建分享链成功:', result._id, shareCode);

    return {
      success: true,
      shareCode,
      expireTime,
      chainId: result._id
    };

  } catch (err) {
    console.error('创建分享链失败:', err);
    return {
      success: false,
      error: err.message || '创建失败',
      shareCode: null
    };
  }
};