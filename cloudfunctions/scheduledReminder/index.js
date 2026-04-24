const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 模板消息ID（需要在微信公众平台配置）
const TEMPLATES = {
  // 报名截止提醒模板
  DEADLINE_REMINDER: 'YOUR_DEADLINE_REMINDER_TEMPLATE_ID',
  // 活动开始提醒模板
  ACTIVITY_START: 'YOUR_ACTIVITY_START_TEMPLATE_ID',
  // 投票结果通知模板
  VOTE_RESULT: 'YOUR_VOTE_RESULT_TEMPLATE_ID'
};

// 云函数入口函数
exports.main = async (event, context) => {
  const now = new Date();
  const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
  const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
  
  console.log('定时触发器执行时间:', now.toISOString());
  
  try {
    // 1. 检查即将截止的报名（15分钟内截止）
    await checkDeadlineReminders(now, fifteenMinutesLater);
    
    // 2. 检查即将开始的活动（15分钟内开始）
    await checkActivityStartReminders(now, fifteenMinutesLater);
    
    // 3. 检查需要发送投票结果的房间
    await checkVoteResults(now);
    
    return {
      success: true,
      message: '定时提醒检查完成',
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('定时提醒执行失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 检查报名截止提醒
async function checkDeadlineReminders(now, deadlineThreshold) {
  console.log('检查报名截止提醒...');
  
  try {
    // 查询截止时间在未来15分钟内且未发送过提醒的房间
    const rooms = await db.collection('rooms')
      .where({
        deadline: _.gt(now).and(_.lte(deadlineThreshold)),
        deadlineReminderSent: _.neq(true),
        status: 'active'
      })
      .get();
    
    console.log(`找到 ${rooms.data.length} 个即将截止的房间`);
    
    for (const room of rooms.data) {
      await sendDeadlineReminder(room);
      
      // 标记已发送提醒
      await db.collection('rooms').doc(room._id).update({
        data: { deadlineReminderSent: true }
      });
    }
  } catch (error) {
    console.error('检查报名截止提醒失败:', error);
  }
}

// 发送报名截止提醒
async function sendDeadlineReminder(room) {
  console.log(`发送报名截止提醒: ${room._id}`);
  
  try {
    // 获取房间内的所有参与者
    const participants = await db.collection('room_participants')
      .where({ roomId: room._id })
      .get();
    
    for (const participant of participants.data) {
      // 检查用户是否订阅了消息
      const subscription = await db.collection('message_subscriptions')
        .where({
          openid: participant.openid,
          type: 'deadline_reminder'
        })
        .get();
      
      if (subscription.data.length > 0) {
        // 调用发送订阅消息的云函数
        await cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            type: 'DEADLINE_REMINDER',
            openid: participant.openid,
            roomId: room._id,
            data: {
              roomTitle: room.title,
              deadline: formatDateTime(room.deadline),
              participantCount: participants.data.length,
              location: room.location || '待定'
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`发送报名截止提醒失败 [${room._id}]:`, error);
  }
}

// 检查活动开始提醒
async function checkActivityStartReminders(now, startThreshold) {
  console.log('检查活动开始提醒...');
  
  try {
    // 查询活动开始时间在未来15分钟内且未发送过提醒的房间
    const rooms = await db.collection('rooms')
      .where({
        appointmentDate: _.gt(now).and(_.lte(startThreshold)),
        activityStartReminderSent: _.neq(true),
        status: 'active'
      })
      .get();
    
    console.log(`找到 ${rooms.data.length} 个即将开始的房间`);
    
    for (const room of rooms.data) {
      await sendActivityStartReminder(room);
      
      // 标记已发送提醒
      await db.collection('rooms').doc(room._id).update({
        data: { activityStartReminderSent: true }
      });
    }
  } catch (error) {
    console.error('检查活动开始提醒失败:', error);
  }
}

// 发送活动开始提醒
async function sendActivityStartReminder(room) {
  console.log(`发送活动开始提醒: ${room._id}`);
  
  try {
    // 获取房间内的所有参与者
    const participants = await db.collection('room_participants')
      .where({ roomId: room._id })
      .get();
    
    for (const participant of participants.data) {
      // 检查用户是否订阅了消息
      const subscription = await db.collection('message_subscriptions')
        .where({
          openid: participant.openid,
          type: 'activity_start'
        })
        .get();
      
      if (subscription.data.length > 0) {
        await cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            type: 'ACTIVITY_START',
            openid: participant.openid,
            roomId: room._id,
            data: {
              roomTitle: room.title,
              startTime: formatDateTime(room.appointmentDate),
              location: room.location || '待定',
              participantCount: participants.data.length
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`发送活动开始提醒失败 [${room._id}]:`, error);
  }
}

// 检查投票结果
async function checkVoteResults(now) {
  console.log('检查投票结果...');
  
  try {
    // 查询已截止且未发送投票结果通知的房间
    const rooms = await db.collection('rooms')
      .where({
        deadline: _.lte(now),
        voteResultSent: _.neq(true),
        status: 'active',
        hasVote: true
      })
      .get();
    
    console.log(`找到 ${rooms.data.length} 个需要发送投票结果的房间`);
    
    for (const room of rooms.data) {
      await sendVoteResultNotification(room);
      
      // 标记已发送投票结果
      await db.collection('rooms').doc(room._id).update({
        data: { voteResultSent: true }
      });
    }
  } catch (error) {
    console.error('检查投票结果失败:', error);
  }
}

// 发送投票结果通知
async function sendVoteResultNotification(room) {
  console.log(`发送投票结果通知: ${room._id}`);
  
  try {
    // 获取投票结果
    const votes = await db.collection('votes')
      .where({ roomId: room._id })
      .get();
    
    // 统计投票结果
    const voteCount = {};
    votes.data.forEach(vote => {
      voteCount[vote.option] = (voteCount[vote.option] || 0) + 1;
    });
    
    // 找出获胜选项
    let winner = '';
    let maxVotes = 0;
    for (const [option, count] of Object.entries(voteCount)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = option;
      }
    }
    
    // 获取房间内的所有参与者
    const participants = await db.collection('room_participants')
      .where({ roomId: room._id })
      .get();
    
    for (const participant of participants.data) {
      // 检查用户是否订阅了消息
      const subscription = await db.collection('message_subscriptions')
        .where({
          openid: participant.openid,
          type: 'vote_result'
        })
        .get();
      
      if (subscription.data.length > 0) {
        await cloud.callFunction({
          name: 'sendSubscribeMessage',
          data: {
            type: 'VOTE_RESULT',
            openid: participant.openid,
            roomId: room._id,
            data: {
              roomTitle: room.title,
              winner: winner || '平局',
              voteCount: maxVotes,
              totalVotes: votes.data.length
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`发送投票结果通知失败 [${room._id}]:`, error);
  }
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
