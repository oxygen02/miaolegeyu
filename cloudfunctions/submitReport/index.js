const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 用户提交举报
 * 参数：
 *   - type: 'room' | 'shop' | 'vote' | 'user'
 *   - targetId: 被举报对象ID
 *   - reason: 举报原因（预设选项）
 *   - description: 详细描述
 *   - images: 证据图片数组（可选）
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { type, targetId, reason, description = '', images = [] } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  if (!type || !targetId || !reason) {
    return { success: false, error: '缺少必要参数' };
  }

  try {
    // 检查是否已举报过
    const existing = await db.collection('reports').where({
      reporterOpenId: OPENID,
      targetId,
      status: _.in(['pending', 'processing'])
    }).get();

    if (existing.data.length > 0) {
      return { success: false, error: '您已举报过该内容，正在处理中' };
    }

    const now = new Date();

    // 创建举报记录
    const result = await db.collection('reports').add({
      data: {
        type,
        targetId,
        reporterOpenId: OPENID,
        reason,
        description,
        images,
        status: 'pending',
        adminReply: '',
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      msg: '举报已提交，我们会尽快处理',
      data: { reportId: result._id }
    };
  } catch (err) {
    console.error('submitReport error:', err);
    return { success: false, error: err.message };
  }
};
