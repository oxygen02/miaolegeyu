const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 管理员openid列表（开发用硬编码）
const ADMIN_OPENIDS = [];

// 从数据库读取管理员配置
async function getAdminOpenIdsFromDB() {
  try {
    const { data } = await db.collection('config').doc('admin').get();
    return data && data.adminOpenIds ? data.adminOpenIds : [];
  } catch (err) {
    return [];
  }
}

async function isAdmin(openid) {
  if (ADMIN_OPENIDS.includes(openid)) return true;
  const dbAdmins = await getAdminOpenIdsFromDB();
  return dbAdmins.includes(openid);
}

/**
 * 管理员获取举报列表
 * 参数：
 *   - page: 页码
 *   - pageSize: 每页数量
 *   - status: 'all' | 'pending' | 'processing' | 'resolved' | 'rejected'
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { page = 1, pageSize = 20, status = 'all' } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  try {
    let whereCondition = {};
    if (status !== 'all') {
      whereCondition.status = status;
    }

    const countRes = await db.collection('reports').where(whereCondition).count();
    const total = countRes.total;

    const skip = (page - 1) * pageSize;
    const { data: reports } = await db.collection('reports')
      .where(whereCondition)
      .orderBy('createdAt', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 获取举报人的用户信息
    const reporterOpenIds = [...new Set(reports.map(r => r.reporterOpenId))];
    const userMap = {};

    if (reporterOpenIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < reporterOpenIds.length; i += batchSize) {
        const batch = reporterOpenIds.slice(i, i + batchSize);
        const userRes = await db.collection('users')
          .where({ _openid: _.in(batch) })
          .get();
        userRes.data.forEach(u => {
          userMap[u._openid] = u;
        });
      }
    }

    const formattedReports = reports.map(r => ({
      _id: r._id,
      type: r.type,
      targetId: r.targetId,
      reason: r.reason,
      description: r.description,
      images: r.images || [],
      status: r.status,
      adminReply: r.adminReply || '',
      reporter: {
        openid: r.reporterOpenId,
        nickName: userMap[r.reporterOpenId]?.nickName || '未知用户',
        avatarUrl: userMap[r.reporterOpenId]?.avatarUrl || ''
      },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    return {
      success: true,
      data: {
        list: formattedReports,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    };
  } catch (err) {
    console.error('adminGetReports error:', err);
    return { success: false, error: err.message };
  }
};
