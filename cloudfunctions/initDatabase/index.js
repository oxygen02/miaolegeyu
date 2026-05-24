const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 初始化数据库集合
 * 创建必要的集合（如果不存在）
 * 注意：权限设置需要在云开发控制台手动配置
 */
exports.main = async (event, context) => {
  const collections = [
    { name: 'users', desc: '用户表' },
    { name: 'config', desc: '配置表' },
    { name: 'reports', desc: '举报表' },
    { name: 'admin_logs', desc: '管理员操作日志' },
    { name: 'rooms', desc: '投票房间' },
    { name: 'shops', desc: '店铺' },
    { name: 'schedule_votes', desc: '时间投票' },
    { name: 'dining_appointments', desc: '约饭活动' }
  ];

  const results = [];

  for (const col of collections) {
    try {
      // 尝试获取集合信息，如果不存在会报错
      await db.collection(col.name).limit(1).get();
      results.push({ name: col.name, status: '已存在', desc: col.desc });
    } catch (err) {
      // 集合不存在，尝试创建（通过添加再删除一个空文档）
      try {
        const tempDoc = await db.collection(col.name).add({
          data: { _init: true, createTime: new Date() }
        });
        await db.collection(col.name).doc(tempDoc._id).remove();
        results.push({ name: col.name, status: '已创建', desc: col.desc });
      } catch (createErr) {
        results.push({ name: col.name, status: '创建失败', error: createErr.message, desc: col.desc });
      }
    }
  }

  return {
    success: true,
    msg: '数据库初始化完成，请在控制台设置各集合的权限规则',
    data: {
      collections: results,
      permissionGuide: {
        users: { read: 'auth.openid == doc._openid', write: 'auth.openid == doc._openid' },
        config: { read: false, write: false },
        reports: { read: 'auth.openid == doc.reporterOpenId', write: 'auth.openid == doc.reporterOpenId' },
        admin_logs: { read: false, write: false },
        rooms: { read: true, write: 'auth.openid == doc.creatorOpenId' },
        shops: { read: true, write: 'auth.openid == doc.creatorOpenId' },
        schedule_votes: { read: true, write: 'auth.openid == doc.creatorOpenId' }
      }
    }
  };
};
