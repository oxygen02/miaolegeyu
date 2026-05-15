/**
 * 创建 feedbacks 集合索引
 * 运行方式: node scripts/createIndexes.js
 */
const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloudbase.init({
  env: 'cloud1-d4gfy27bn0f3f5346',
  // 需要先在微信开发者工具中登录并获取 secretId 和 secretKey
  // 或者使用临时密钥
});

const db = app.database();

async function createIndexes() {
  try {
    console.log('开始创建索引...');

    // 创建 status 字段索引
    await db.collection('feedbacks').createIndex({
      name: 'status_index',
      unique: false,
      keys: {
        status: 1
      }
    });
    console.log('✅ status 索引创建成功');

    // 创建 type 字段索引
    await db.collection('feedbacks').createIndex({
      name: 'type_index',
      unique: false,
      keys: {
        type: 1
      }
    });
    console.log('✅ type 索引创建成功');

    // 创建 createTime 字段索引（降序，用于排序）
    await db.collection('feedbacks').createIndex({
      name: 'createTime_index',
      unique: false,
      keys: {
        createTime: -1
      }
    });
    console.log('✅ createTime 索引创建成功');

    // 创建复合索引：status + createTime（最常用的查询组合）
    await db.collection('feedbacks').createIndex({
      name: 'status_createTime_index',
      unique: false,
      keys: {
        status: 1,
        createTime: -1
      }
    });
    console.log('✅ status + createTime 复合索引创建成功');

    // 创建复合索引：type + createTime
    await db.collection('feedbacks').createIndex({
      name: 'type_createTime_index',
      unique: false,
      keys: {
        type: 1,
        createTime: -1
      }
    });
    console.log('✅ type + createTime 复合索引创建成功');

    console.log('\n🎉 所有索引创建完成！');
  } catch (err) {
    console.error('❌ 创建索引失败:', err.message);
    console.log('\n💡 提示：请确保已登录云开发环境');
    console.log('   在微信开发者工具中：云开发 → 数据库 → 索引管理 → 添加索引');
  }
}

createIndexes();