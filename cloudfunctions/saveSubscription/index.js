const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { subscriptions } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!OPENID) {
    return { success: false, error: '无法获取用户openid' };
  }
  
  console.log('保存订阅状态:', { openid: OPENID, subscriptions });
  
  try {
    // 模板ID映射
    const templateMap = {
      'YOUR_TMPL_ID_1': 'deadline_reminder',    // 报名截止提醒
      'YOUR_TMPL_ID_2': 'activity_start',       // 活动开始提醒
      'YOUR_TMPL_ID_3': 'vote_result'           // 投票结果通知
    };
    
    const savePromises = [];
    
    // 遍历订阅结果，保存到数据库
    for (const [templateId, status] of Object.entries(subscriptions)) {
      if (templateId === 'errMsg') continue; // 跳过错误信息字段
      
      const type = templateMap[templateId];
      if (!type) continue;
      
      // 检查是否已存在该订阅记录
      const existing = await db.collection('message_subscriptions')
        .where({
          openid: OPENID,
          type: type
        })
        .get();
      
      if (existing.data.length > 0) {
        // 更新现有记录
        savePromises.push(
          db.collection('message_subscriptions').doc(existing.data[0]._id).update({
            data: {
              status: status, // 'accept' 或 'reject'
              templateId: templateId,
              updateTime: db.serverDate()
            }
          })
        );
      } else {
        // 创建新记录
        savePromises.push(
          db.collection('message_subscriptions').add({
            data: {
              openid: OPENID,
              type: type,
              templateId: templateId,
              status: status,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
        );
      }
    }
    
    await Promise.all(savePromises);
    
    return {
      success: true,
      message: '订阅状态保存成功'
    };
  } catch (error) {
    console.error('保存订阅状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
