const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const results = {
      collections: [],
      indexes: [],
      errors: []
    };

    // 创建集合的辅助函数
    const createCollection = async (collectionName) => {
      try {
        await db.createCollection(collectionName);
        results.collections.push({ name: collectionName, status: '创建成功' });
      } catch (err) {
        if (err.message && err.message.includes('already exists')) {
          results.collections.push({ name: collectionName, status: '已存在' });
        } else {
          results.errors.push({ type: 'collection', name: collectionName, error: err.message });
        }
      }
    };

    // 创建索引的辅助函数
    const createIndex = async (collectionName, indexName, keys, options = {}) => {
      try {
        // 检查索引是否已存在
        const indexes = await db.collection(collectionName).getIndexes();
        const exists = indexes.data.some(idx => idx.name === indexName);
        
        if (exists) {
          results.indexes.push({ collection: collectionName, name: indexName, status: '已存在' });
          return;
        }

        // 创建索引
        await db.collection(collectionName).createIndex({
          name: indexName,
          keys,
          ...options
        });
        
        results.indexes.push({ collection: collectionName, name: indexName, status: '创建成功' });
      } catch (err) {
        results.errors.push({ collection: collectionName, name: indexName, error: err.message });
      }
    };

    // ========== 创建集合 ==========
    await createCollection('rooms');
    await createCollection('room_participants');
    await createCollection('votes');
    await createCollection('group_order_participants');
    await createCollection('shops');
    await createCollection('shop_favorites');
    await createCollection('dining_appointments');
    await createCollection('users');

    // ========== rooms 集合索引 ==========
    await createIndex('rooms', 'idx_roomId_unique', { roomId: 1 }, { unique: true });
    await createIndex('rooms', 'idx_status_createdAt', { status: 1, createdAt: -1 });
    await createIndex('rooms', 'idx_creatorOpenId', { creatorOpenId: 1 });
    await createIndex('rooms', 'idx_mode_status', { mode: 1, status: 1 });
    await createIndex('rooms', 'idx_voteDeadline', { voteDeadline: 1 });

    // ========== room_participants 集合索引 ==========
    await createIndex('room_participants', 'idx_roomId_openid_unique', { roomId: 1, openid: 1 }, { unique: true });
    await createIndex('room_participants', 'idx_roomId', { roomId: 1 });
    await createIndex('room_participants', 'idx_openid', { openid: 1 });
    await createIndex('room_participants', 'idx_status', { status: 1 });

    // ========== votes 集合索引 ==========
    await createIndex('votes', 'idx_roomId_openid_unique', { roomId: 1, openid: 1 }, { unique: true });
    await createIndex('votes', 'idx_roomId', { roomId: 1 });
    await createIndex('votes', 'idx_openid', { openid: 1 });
    await createIndex('votes', 'idx_createdAt', { createdAt: -1 });

    // ========== group_order_participants 集合索引 ==========
    await createIndex('group_order_participants', 'idx_roomId_openid_unique', { roomId: 1, openid: 1 }, { unique: true });
    await createIndex('group_order_participants', 'idx_roomId', { roomId: 1 });

    // ========== shops 集合索引 ==========
    await createIndex('shops', 'idx_status_createTime', { status: 1, createTime: -1 });
    await createIndex('shops', 'idx_cuisine', { cuisine: 1 });
    await createIndex('shops', 'idx_openid', { openid: 1 });
    await createIndex('shops', 'idx_avgPrice', { avgPrice: 1 });

    // ========== shop_favorites 集合索引 ==========
    await createIndex('shop_favorites', 'idx_shopId_openid_unique', { shopId: 1, openid: 1 }, { unique: true });
    await createIndex('shop_favorites', 'idx_openid', { openid: 1 });
    await createIndex('shop_favorites', 'idx_createTime', { createTime: -1 });

    // ========== dining_appointments 集合索引 ==========
    await createIndex('dining_appointments', 'idx_shopId', { shopId: 1 });
    await createIndex('dining_appointments', 'idx_initiatorOpenId', { initiatorOpenId: 1 });
    await createIndex('dining_appointments', 'idx_status_deadline', { status: 1, deadline: 1 });
    await createIndex('dining_appointments', 'idx_createTime', { createTime: -1 });

    // ========== users 集合索引 ==========
    await createIndex('users', 'idx_openid_unique', { _openid: 1 }, { unique: true });
    await createIndex('users', 'idx_userId', { userId: 1 });

    return {
      code: 0,
      msg: '数据库索引初始化完成',
      data: results
    };
  } catch (err) {
    console.error('initDatabase error:', err);
    return {
      code: -1,
      msg: err.message || '初始化失败',
      error: err
    };
  }
};
