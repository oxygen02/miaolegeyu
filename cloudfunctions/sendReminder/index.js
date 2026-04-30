const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 引入模板配置
const { TEMPLATES } = require('../config/templates');

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, targetId, roomTitle, isAnonymous } = event;

  if (!roomId || !targetId) {
    return { code: -1, msg: '参数不完整' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = roomResult.data[0];

    // 权限校验：只有房主可以发送催票
    if (room.creatorOpenId !== wxContext.OPENID) {
      return { code: 403, msg: '只有房主可发送催票提醒' };
    }

    // 检查房间状态
    if (room.status !== 'voting') {
      return { code: -1, msg: '投票已结束' };
    }

    // 获取目标用户信息
    const targetResult = await db.collection('room_participants')
      .where({
        roomId,
        _id: targetId
      })
      .limit(1)
      .get();

    if (!targetResult.data || targetResult.data.length === 0) {
      return { code: -1, msg: '目标用户不存在' };
    }

    const target = targetResult.data[0];

    // 检查是否已投票
    if (target.status === 'voted') {
      return { code: -1, msg: '该用户已完成投票' };
    }

    // 获取用户openid
    const targetOpenid = target.openid;

    // 获取用户订阅消息设置
    const userResult = await db.collection('users')
      .where({ _openid: targetOpenid })
      .limit(1)
      .get();

    const user = userResult.data && userResult.data[0];
    const nickName = isAnonymous ? '匿名喵友' : (user ? user.nickName : '喵友');

    // 发送订阅消息
    try {
      // 检查模板ID是否已配置
      if (!TEMPLATES.REMIND_VOTE) {
        console.log('订阅消息模板ID未配置，跳过发送');
      } else {
        // 适配「投票到期提醒」模板字段
        // thing1: 投票地址, time2: 到期时间, thing3: 备注
        await cloud.openapi.subscribeMessage.send({
          touser: targetOpenid,
          templateId: TEMPLATES.REMIND_VOTE,
          page: `/pages/vote/vote?roomId=${roomId}`,
          data: {
            thing1: { value: truncateString(roomTitle || '聚餐投票', 20) }, // 投票地址 → 房间标题
            time2: { value: formatDateTime(room.deadline || Date.now() + 3600000) }, // 到期时间
            thing3: { value: '发起人提醒您尽快投票，点击参与投票' } // 备注
          },
          miniprogramState: 'formal'
        });
        console.log('订阅消息发送成功');
      }
    } catch (msgErr) {
      console.log('订阅消息发送失败（用户可能未授权）:', msgErr);
      // 订阅消息失败不阻断流程
    }

    // 记录催票日志
    await db.collection('reminder_logs').add({
      data: {
        roomId,
        targetId: targetOpenid,
        targetName: nickName,
        sentBy: wxContext.OPENID,
        sentAt: db.serverDate(),
        isAnonymous: !!isAnonymous
      }
    });

    return {
      code: 0,
      data: {
        targetName: nickName,
        sentAt: new Date().toISOString()
      },
      msg: '提醒已发送'
    };
  } catch (err) {
    console.error('sendReminder error:', err);
    return { code: -1, msg: err.message || '发送提醒失败' };
  }
};

// 截断字符串以符合微信模板限制
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '…';
}

// 格式化日期时间（用于模板消息）
function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}:${minute}`;
}
