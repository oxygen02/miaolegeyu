const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { type, content, contact, userInfo, systemInfo } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 参数校验
    if (!type || !content) {
      return { success: false, msg: '反馈类型和内容不能为空' };
    }

    if (content.length > 500) {
      return { success: false, msg: '反馈内容不能超过500字' };
    }

    // 写入反馈集合
    await db.collection('feedbacks').add({
      data: {
        type,
        content,
        contact: contact || '',
        openid: wxContext.OPENID,
        userInfo: userInfo || {},
        systemInfo: systemInfo || {},
        status: 'pending', // pending, processing, resolved
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    return { success: true, msg: '反馈提交成功' };
  } catch (err) {
    console.error('提交反馈失败:', err);
    return { success: false, msg: '提交失败，请稍后重试' };
  }
};