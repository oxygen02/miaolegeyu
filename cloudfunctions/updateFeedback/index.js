const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 管理员更新反馈状态
 * 支持: 标记处理中、标记已解决、添加回复
 */
exports.main = async (event) => {
  const { 
    feedbackId,       // 反馈ID
    status,           // 新状态: pending, processing, resolved
    reply,            // 管理员回复内容
    operator          // 操作人备注
  } = event;

  try {
    // 参数校验
    if (!feedbackId) {
      return { success: false, msg: '反馈ID不能为空' };
    }

    if (!status && !reply) {
      return { success: false, msg: '状态或回复至少需要一个' };
    }

    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    };

    if (status) {
      // 校验状态值
      const validStatus = ['pending', 'processing', 'resolved'];
      if (!validStatus.includes(status)) {
        return { success: false, msg: '无效的状态值' };
      }
      updateData.status = status;
    }

    if (reply) {
      updateData.reply = reply;
      updateData.repliedAt = db.serverDate();
    }

    if (operator) {
      updateData.operator = operator;
    }

    // 执行更新
    const result = await db.collection('feedbacks')
      .doc(feedbackId)
      .update({
        data: updateData
      });

    if (result.stats.updated === 0) {
      return { success: false, msg: '反馈不存在或无需更新' };
    }

    return {
      success: true,
      msg: '更新成功',
      data: {
        feedbackId,
        updatedFields: Object.keys(updateData)
      }
    };

  } catch (err) {
    console.error('更新反馈失败:', err);
    return {
      success: false,
      msg: '更新失败: ' + err.message
    };
  }
};