const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 迁移/升级用户数据，为已有用户添加状态管理字段
 * 使用方式：
 * 1. 部署此云函数
 * 2. 在微信开发者工具中调用此云函数
 * 3. 或在云开发控制台-云函数中测试调用
 *
 * 参数：
 *   - dryRun: true（默认）只统计不修改，false 执行实际更新
 *   - batchSize: 每次处理数量（默认100）
 */
exports.main = async (event, context) => {
  const { dryRun = true, batchSize = 100 } = event;

  try {
    // 获取所有缺少 status 字段的用户
    const { data: usersToMigrate } = await db.collection('users')
      .where({
        status: _.exists(false)
      })
      .limit(batchSize)
      .get();

    if (usersToMigrate.length === 0) {
      return {
        success: true,
        msg: '所有用户数据已是最新，无需迁移',
        data: { migratedCount: 0, totalNeedMigration: 0 }
      };
    }

    // 统计还需要迁移的总数（估算）
    const countRes = await db.collection('users')
      .where({ status: _.exists(false) })
      .count();

    if (dryRun) {
      return {
        success: true,
        msg: `【模拟运行】发现 ${countRes.total} 个用户需要迁移`,
        data: {
          dryRun: true,
          totalNeedMigration: countRes.total,
          sampleUsers: usersToMigrate.slice(0, 3).map(u => ({
            _id: u._id,
            nickName: u.nickName,
            currentFields: Object.keys(u)
          }))
        }
      };
    }

    // 实际迁移
    const updatePromises = usersToMigrate.map(user => {
      return db.collection('users').doc(user._id).update({
        data: {
          status: 'normal',
          banReason: '',
          banUntil: null,
          bannedAt: null,
          bannedBy: '',
          muteReason: '',
          muteUntil: null,
          mutedAt: null,
          mutedBy: '',
          violationCount: 0
        }
      });
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      msg: `成功迁移 ${usersToMigrate.length} 个用户`,
      data: {
        migratedCount: usersToMigrate.length,
        remainingCount: countRes.total - usersToMigrate.length
      }
    };
  } catch (err) {
    console.error('migrateUsers error:', err);
    return { success: false, error: err.message };
  }
};
