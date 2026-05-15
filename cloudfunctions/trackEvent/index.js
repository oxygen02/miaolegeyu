const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { events } = event;
  const wxContext = cloud.getWXContext();

  try {
    if (!Array.isArray(events) || events.length === 0) {
      return { success: false, msg: '事件列表为空' };
    }

    // 批量写入事件
    const batch = events.map(event => ({
      data: {
        ...event,
        openid: wxContext.OPENID,
        createTime: db.serverDate()
      }
    }));

    // 使用 Promise.all 批量添加
    await Promise.all(batch.map(item => db.collection('events').add(item)));

    return { success: true, msg: `上报 ${events.length} 条事件成功` };
  } catch (err) {
    console.error('埋点上报失败:', err);
    return { success: false, msg: '上报失败' };
  }
};