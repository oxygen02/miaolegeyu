const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化管理员配置
 * 使用方式：
 * 1. 先部署此云函数
 * 2. 在小程序端调用此函数，传入你的openid
 * 3. 或在微信开发者工具-云开发-数据库中手动创建 config 集合
 *
 * 参数：
 *   - openid: 要设为管理员的openid（不传则使用当前调用者openid）
 *   - action: 'add' | 'remove' | 'list' | 'init'
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { openid, action = 'init' } = event;

  try {
    if (action === 'init') {
      // 初始化/创建 config 集合的 admin 文档
      try {
        await db.collection('config').doc('admin').get();
        // 已存在，更新
        await db.collection('config').doc('admin').update({
          data: {
            adminOpenIds: db.command.set([openid || OPENID]),
            updatedAt: new Date()
          }
        });
      } catch (err) {
        // 不存在，创建
        await db.collection('config').add({
          data: {
            _id: 'admin',
            adminOpenIds: [openid || OPENID],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      return {
        success: true,
        msg: '管理员配置已初始化',
        data: {
          adminOpenIds: [openid || OPENID]
        }
      };
    }

    if (action === 'add') {
      // 添加管理员
      const targetId = openid || OPENID;
      await db.collection('config').doc('admin').update({
        data: {
          adminOpenIds: db.command.addToSet(targetId),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        msg: `已添加管理员: ${targetId}`,
        data: { addedOpenId: targetId }
      };
    }

    if (action === 'remove') {
      // 移除管理员
      const targetId = openid || OPENID;
      const { data } = await db.collection('config').doc('admin').get();
      const newList = (data.adminOpenIds || []).filter(id => id !== targetId);

      await db.collection('config').doc('admin').update({
        data: {
          adminOpenIds: newList,
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        msg: `已移除管理员: ${targetId}`,
        data: { removedOpenId: targetId }
      };
    }

    if (action === 'list') {
      // 列出所有管理员
      const { data } = await db.collection('config').doc('admin').get();
      return {
        success: true,
        data: {
          adminOpenIds: data.adminOpenIds || []
        }
      };
    }

    return { success: false, error: '未知操作' };
  } catch (err) {
    console.error('initAdminConfig error:', err);
    return { success: false, error: err.message };
  }
};
