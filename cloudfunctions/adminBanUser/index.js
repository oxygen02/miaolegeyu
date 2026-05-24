const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 管理员openid列表
// 方式1：直接写死（适合开发测试，上线前务必改为方式2）
const ADMIN_OPENIDS = [
  // 示例：'oXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  // 把你的微信openid填在这里
];

// 方式2（推荐）：从数据库配置表读取管理员列表（更灵活，支持动态配置）
// 需要先执行 initAdminConfig 云函数创建配置
async function getAdminOpenIdsFromDB() {
  try {
    const { data } = await db.collection('config').doc('admin').get();
    return data && data.adminOpenIds ? data.adminOpenIds : [];
  } catch (err) {
    return [];
  }
}

/**
 * 检查是否为管理员
 */
async function isAdmin(openid) {
  // 优先检查硬编码列表（开发用）
  if (ADMIN_OPENIDS.includes(openid)) return true;
  // 再检查数据库配置（生产用）
  const dbAdmins = await getAdminOpenIdsFromDB();
  return dbAdmins.includes(openid);
}

/**
 * 管理员封禁/解封用户
 * 参数：
 *   - targetOpenId: 目标用户openid
 *   - action: 'ban' | 'unban' | 'mute' | 'unmute'
 *   - reason: 封禁原因
 *   - duration: 封禁时长（小时），不传表示永久
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { targetOpenId, action = 'ban', reason = '', duration } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  // 权限检查
  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  if (!targetOpenId) {
    return { success: false, error: '缺少目标用户ID' };
  }

  try {
    const now = new Date();
    let updateData = {};
    let logAction = '';

    if (action === 'ban') {
      // 封禁用户
      updateData = {
        status: 'banned',
        banReason: reason,
        banUntil: duration ? new Date(now.getTime() + duration * 3600000) : null,
        bannedAt: now,
        bannedBy: OPENID,
        updatedAt: now
      };
      logAction = 'ban_user';
    } else if (action === 'unban') {
      // 解封用户
      updateData = {
        status: 'normal',
        banReason: '',
        banUntil: null,
        unbannedAt: now,
        unbannedBy: OPENID,
        updatedAt: now
      };
      logAction = 'unban_user';
    } else if (action === 'mute') {
      // 禁言（禁止发起活动）
      updateData = {
        status: 'muted',
        muteReason: reason,
        muteUntil: duration ? new Date(now.getTime() + duration * 3600000) : null,
        mutedAt: now,
        mutedBy: OPENID,
        updatedAt: now
      };
      logAction = 'mute_user';
    } else if (action === 'unmute') {
      // 解除禁言
      updateData = {
        status: 'normal',
        muteReason: '',
        muteUntil: null,
        unmutedAt: now,
        unmutedBy: OPENID,
        updatedAt: now
      };
      logAction = 'unmute_user';
    } else {
      return { success: false, error: '未知操作类型' };
    }

    // 更新用户状态
    const userRes = await db.collection('users').where({
      _openid: targetOpenId
    }).get();

    if (userRes.data.length === 0) {
      return { success: false, error: '用户不存在' };
    }

    await db.collection('users').doc(userRes.data[0]._id).update({
      data: updateData
    });

    // 记录操作日志
    await db.collection('admin_logs').add({
      data: {
        adminOpenId: OPENID,
        action: logAction,
        targetId: targetOpenId,
        details: {
          reason,
          duration: duration || null,
          previousStatus: userRes.data[0].status || 'normal'
        },
        createdAt: now
      }
    });

    return {
      success: true,
      msg: action === 'ban' ? '用户已封禁' :
           action === 'unban' ? '用户已解封' :
           action === 'mute' ? '用户已禁言' : '用户已解除禁言'
    };
  } catch (err) {
    console.error('adminBanUser error:', err);
    return { success: false, error: err.message };
  }
};
