const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化数据库 - 创建集合和索引
 * 仅供管理员使用
 */
exports.main = async (event, context) => {
  const { action } = event;

  try {
    switch (action) {
      case 'createIndexes':
        return await createFeedbacksIndexes();
      case 'initCollections':
        return await initCollections();
      default:
        return { success: false, msg: '未知操作' };
    }
  } catch (err) {
    console.error('数据库初始化失败:', err);
    return { success: false, msg: err.message };
  }
};

/**
 * 创建 feedbacks 集合索引
 */
async function createFeedbacksIndexes() {
  const results = [];

  try {
    // 1. status 单字段索引
    await db.collection('feedbacks').createIndex({
      name: 'status_index',
      unique: false,
      keys: { status: 1 }
    });
    results.push({ name: 'status_index', status: 'success' });
  } catch (err) {
    results.push({ name: 'status_index', status: 'failed', error: err.message });
  }

  try {
    // 2. type 单字段索引
    await db.collection('feedbacks').createIndex({
      name: 'type_index',
      unique: false,
      keys: { type: 1 }
    });
    results.push({ name: 'type_index', status: 'success' });
  } catch (err) {
    results.push({ name: 'type_index', status: 'failed', error: err.message });
  }

  try {
    // 3. createTime 单字段索引（降序，用于时间排序）
    await db.collection('feedbacks').createIndex({
      name: 'createTime_index',
      unique: false,
      keys: { createTime: -1 }
    });
    results.push({ name: 'createTime_index', status: 'success' });
  } catch (err) {
    results.push({ name: 'createTime_index', status: 'failed', error: err.message });
  }

  try {
    // 4. status + createTime 复合索引（最常用的查询组合）
    await db.collection('feedbacks').createIndex({
      name: 'status_createTime_index',
      unique: false,
      keys: { status: 1, createTime: -1 }
    });
    results.push({ name: 'status_createTime_index', status: 'success' });
  } catch (err) {
    results.push({ name: 'status_createTime_index', status: 'failed', error: err.message });
  }

  try {
    // 5. type + createTime 复合索引
    await db.collection('feedbacks').createIndex({
      name: 'type_createTime_index',
      unique: false,
      keys: { type: 1, createTime: -1 }
    });
    results.push({ name: 'type_createTime_index', status: 'success' });
  } catch (err) {
    results.push({ name: 'type_createTime_index', status: 'failed', error: err.message });
  }

  const successCount = results.filter(r => r.status === 'success').length;

  return {
    success: true,
    msg: `索引创建完成: ${successCount}/${results.length} 成功`,
    data: results
  };
}

/**
 * 初始化集合（如果不存在则创建）
 */
async function initCollections() {
  const collections = ['feedbacks', 'events'];
  const results = [];

  for (const collName of collections) {
    try {
      // 尝试向集合添加一个空文档再删除，来确保集合存在
      const tempRes = await db.collection(collName).add({
        data: { _init: true, createTime: db.serverDate() }
      });

      // 删除临时文档
      await db.collection(collName).doc(tempRes._id).remove();

      results.push({ name: collName, status: 'exists_or_created' });
    } catch (err) {
      // 集合可能已存在但权限不足，或其他错误
      results.push({ name: collName, status: 'check_failed', error: err.message });
    }
  }

  return {
    success: true,
    msg: '集合初始化完成',
    data: results
  };
}