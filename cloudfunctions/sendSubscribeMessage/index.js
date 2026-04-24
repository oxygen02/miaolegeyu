const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 订阅消息模板ID（需要在微信公众平台申请）
const TEMPLATES = {
  // 报名截止提醒
  DEADLINE_REMINDER: 'YOUR_DEADLINE_REMINDER_TEMPLATE_ID',
  // 活动开始提醒
  ACTIVITY_START: 'YOUR_ACTIVITY_START_TEMPLATE_ID',
  // 投票结果通知
  VOTE_RESULT: 'YOUR_VOTE_RESULT_TEMPLATE_ID'
};

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

// 发送报名截止提醒
async function sendDeadlineReminder(roomId, openid, data) {
  const { roomTitle, deadline, participantCount, location } = data;
  
  // 截断字段以符合微信模板消息长度限制
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
  
  // 截断字段以符合微信模板消息长度限制
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
  const { roomTitle, winner, voteCount, totalVotes } = data;
  
  // 截断字段以符合微信模板消息长度限制
  const title = truncateString(roomTitle || '投票活动', 20);
  const result = truncateString(winner || '平局', 20);
  
  console.log(`发送投票结果通知给 ${openid}:`, { title, result, voteCount, totalVotes });
  
  return await cloud.openapi.subscribeMessage.send({
    touser: openid,
    templateId: TEMPLATES.VOTE_RESULT,
    page: `pages/room-detail/room-detail?roomId=${roomId}`,
    data: {
      thing1: { value: title }, // 投票主题
      thing2: { value: result }, // 投票结果
      thing3: { value: `${voteCount || 0}票/${totalVotes || 0}总票数` }, // 统计信息
      time4: { value: formatDateTime(new Date()) } // 通知时间
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
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
