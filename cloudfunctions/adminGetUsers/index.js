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
 * 获取用户列表（管理员）
 * 参数：
 *   - page: 页码（默认1）
 *   - pageSize: 每页数量（默认20）
 *   - status: 筛选状态 'all' | 'normal' | 'banned' | 'muted'
 *   - keyword: 搜索关键词（昵称）
 *   - sortBy: 排序字段 'createTime' | 'lastLogin' | 'violationCount'
 *   - sortOrder: 'asc' | 'desc'
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const {
    page = 1,
    pageSize = 20,
    status = 'all',
    keyword = '',
    sortBy = 'createTime',
    sortOrder = 'desc'
  } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  try {
    // 构建查询条件
    let whereCondition = {};

    if (status !== 'all') {
      whereCondition.status = status;
    }

    if (keyword) {
      whereCondition.nickName = db.RegExp({
        regexp: keyword,
        options: 'i'
      });
    }

    // 获取总数
    const countRes = await db.collection('users').where(whereCondition).count();
    const total = countRes.total;

    // 排序
    const orderField = sortBy === 'createTime' ? 'createdAt' :
                       sortBy === 'lastLogin' ? 'lastLoginAt' :
                       sortBy === 'violationCount' ? 'violationCount' : 'createdAt';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    // 分页查询
    const skip = (page - 1) * pageSize;
    const { data: users } = await db.collection('users')
      .where(whereCondition)
      .orderBy(orderField, orderDirection)
      .skip(skip)
      .limit(pageSize)
      .get();

    // 格式化用户数据
    const formattedUsers = users.map(user => ({
      openid: user._openid,
      nickName: user.nickName || '未知用户',
      avatarUrl: user.avatarUrl || '',
      status: user.status || 'normal',
      banReason: user.banReason || '',
      banUntil: user.banUntil || null,
      muteReason: user.muteReason || '',
      muteUntil: user.muteUntil || null,
      violationCount: user.violationCount || 0,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null
    }));

    return {
      success: true,
      data: {
        list: formattedUsers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    };
  } catch (err) {
    console.error('adminGetUsers error:', err);
    return { success: false, error: err.message };
  }
};
