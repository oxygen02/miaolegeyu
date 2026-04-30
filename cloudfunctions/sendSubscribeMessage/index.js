const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 引入模板配置
const { TEMPLATES } = require('../config/templates');

exports.main = async (event, context) => {
  const { type, roomId, appointmentId, openid, data } = event;

  console.log('收到发送消息请求:', { type, roomId, appointmentId, openid });

  try {
    let result;

    switch (type) {
      case 'DEADLINE_REMINDER':
      case 'deadline_reminder':
        // 报名截止提醒
        result = await sendDeadlineReminder(roomId, openid, data);
        break;
      case 'ACTIVITY_START':
      case 'activity_start':
        // 活动开始提醒
        result = await sendActivityStart(roomId, openid, data);
        break;
      case 'VOTE_RESULT':
      case 'vote_result':
        // 投票结果通知
        result = await sendVoteResult(roomId, openid, data);
        break;
      case 'REMIND_VOTE':
      case 'remind_vote':
        // 催票提醒
        result = await sendRemindVote(roomId, openid, data);
        break;
      default:
        return { success: false, error: '未知的消息类型: ' + type };
    }

    console.log('消息发送成功:', result);
    return { success: true, result };
  } catch (err) {
    console.error('发送订阅消息失败:', err);
    return { success: false, error: err.message };
  }
};

// 检查模板ID是否配置
function checkTemplate(templateId, name) {
  if (!templateId) {
    console.log(`${name} 模板ID未配置，跳过发送`);
    return false;
  }
  return true;
}

// 发送催票提醒
async function sendRemindVote(roomId, openid, data) {
  const { roomTitle, deadline } = data;

  if (!checkTemplate(TEMPLATES.REMIND_VOTE, '催票提醒')) {
    return { skipped: true, reason: '模板ID未配置' };
  }

  const title = truncateString(roomTitle || '聚餐投票', 20);

  console.log(`发送催票提醒给 ${openid}:`, { title });

  // 适配「投票到期提醒」模板字段
  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATES.REMIND_VOTE,
    page: `pages/vote/vote?roomId=${roomId}`,
    data: {
      thing1: { value: title }, // 投票地址
      time2: { value: formatDateTime(deadline || Date.now() + 3600000) }, // 到期时间
      thing3: { value: '发起人提醒您尽快投票，点击参与投票' } // 备注
    },
    miniprogramState: 'formal'
  });
}

// 发送报名截止提醒
async function sendDeadlineReminder(roomId, openid, data) {
  const { roomTitle, deadline, participantCount, location } = data;

  if (!checkTemplate(TEMPLATES.DEADLINE_REMINDER, '报名截止提醒')) {
    return { skipped: true, reason: '模板ID未配置' };
  }

  const title = truncateString(roomTitle || '聚餐活动', 20);
  const timeStr = deadline || '';
  const loc = truncateString(location || '待定', 20);

  console.log(`发送报名截止提醒给 ${openid}:`, { title, timeStr, loc });

  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATES.DEADLINE_REMINDER,
    page: `pages/room-detail/room-detail?roomId=${roomId}`,
    data: {
      thing1: { value: title }, // 活动名称
      time2: { value: timeStr }, // 截止时间
      thing3: { value: `地点: ${loc}` }, // 备注
      number4: { value: participantCount || 0 } // 当前报名人数
    },
    miniprogramState: 'formal'
  });
}

// 发送活动开始提醒
async function sendActivityStart(roomId, openid, data) {
  const { roomTitle, startTime, location, participantCount } = data;

  if (!checkTemplate(TEMPLATES.ACTIVITY_START, '活动开始提醒')) {
    return { skipped: true, reason: '模板ID未配置' };
  }

  const title = truncateString(roomTitle || '聚餐活动', 20);
  const timeStr = startTime || '';
  const loc = truncateString(location || '待定', 20);

  console.log(`发送活动开始提醒给 ${openid}:`, { title, timeStr, loc });

  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATES.ACTIVITY_START,
    page: `pages/room-detail/room-detail?roomId=${roomId}`,
    data: {
      thing1: { value: title }, // 活动名称
      time2: { value: timeStr }, // 活动时间
      thing3: { value: loc }, // 活动地点
      thing4: { value: `共${participantCount || 0}人参加，请准时到达` } // 温馨提示
    },
    miniprogramState: 'formal'
  });
}

// 发送投票结果通知
async function sendVoteResult(roomId, openid, data) {
  const { roomTitle, winner, voteCount, totalVotes, deadline } = data;

  if (!checkTemplate(TEMPLATES.VOTE_RESULT, '投票结果通知')) {
    return { skipped: true, reason: '模板ID未配置' };
  }

  const title = truncateString(roomTitle || '投票活动', 20);
  const result = truncateString(winner || '平局', 20);

  console.log(`发送投票结果通知给 ${openid}:`, { title, result, voteCount, totalVotes });

  // 适配「投票结果通知」模板字段
  // thing1: 场次, time2: 开场时间, thing3: 地点, thing4: 温馨提示, time5: 结束时间
  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATES.VOTE_RESULT,
    page: `pages/result/result?roomId=${roomId}`,
    data: {
      thing1: { value: title }, // 场次 → 投票主题
      time2: { value: formatDateTime(deadline) }, // 开场时间 → 投票截止时间
      thing3: { value: result }, // 地点 → 获胜选项
      thing4: { value: `支持率 ${Math.round((voteCount / totalVotes) * 100)}% (${voteCount}/${totalVotes}票)` }, // 温馨提示
      time5: { value: formatDateTime(new Date()) } // 结束时间 → 结果公布时间
    },
    miniprogramState: 'formal'
  });
}

// 截断字符串以符合微信模板限制
function truncateString(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '…';
}

// 格式化日期时间
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
