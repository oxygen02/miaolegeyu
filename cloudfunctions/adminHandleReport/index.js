const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
 * 管理员处理举报
 * 参数：
 *   - reportId: 举报记录ID
 *   - action: 'resolve' | 'reject' | 'processing'
 *   - reply: 处理回复
 *   - deleteContent: 是否同时删除内容（true/false）
 *   - banUser: 是否同时封禁用户（true/false）
 *   - banReason: 封禁原因
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const {
    reportId,
    action = 'resolve',
    reply = '',
    deleteContent = false,
    banUser = false,
    banReason = ''
  } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  if (!reportId) {
    return { success: false, error: '缺少举报ID' };
  }

  try {
    const now = new Date();

    // 获取举报记录
    const reportRes = await db.collection('reports').doc(reportId).get();
    if (!reportRes.data) {
      return { success: false, error: '举报记录不存在' };
    }

    const report = reportRes.data;

    // 更新举报状态
    const statusMap = {
      resolve: 'resolved',
      reject: 'rejected',
      processing: 'processing'
    };

    await db.collection('reports').doc(reportId).update({
      data: {
        status: statusMap[action] || 'resolved',
        adminReply: reply,
        handledBy: OPENID,
        handledAt: now,
        updatedAt: now
      }
    });

    // 如果需要删除内容
    if (deleteContent && report.targetId) {
      const typeMap = {
        room: 'rooms',
        shop: 'shops',
        vote: 'schedule_votes',
        appointment: 'dining_appointments'
      };

      const collectionName = typeMap[report.type];
      if (collectionName) {
        if (report.type === 'room') {
          await db.collection('rooms').where({ roomId: report.targetId }).remove();
          await db.collection('room_participants').where({ roomId: report.targetId }).remove();
        } else {
          await db.collection(collectionName).doc(report.targetId).remove();
        }
      }
    }

    // 如果需要封禁用户，需要获取内容创建者
    if (banUser && report.targetId) {
      let creatorOpenId = '';

      if (report.type === 'room') {
        const res = await db.collection('rooms').where({ roomId: report.targetId }).get();
        if (res.data.length > 0) creatorOpenId = res.data[0].creatorOpenId;
      } else if (report.type === 'shop') {
        const res = await db.collection('shops').doc(report.targetId).get();
        if (res.data) creatorOpenId = res.data.creatorOpenId;
      } else if (report.type === 'vote') {
        const res = await db.collection('schedule_votes').doc(report.targetId).get();
        if (res.data) creatorOpenId = res.data.creatorOpenId;
      } else if (report.type === 'appointment') {
        const res = await db.collection('dining_appointments').doc(report.targetId).get();
        if (res.data) creatorOpenId = res.data.initiatorOpenId;
      }

      if (creatorOpenId) {
        const userRes = await db.collection('users').where({ _openid: creatorOpenId }).get();
        if (userRes.data.length > 0) {
          await db.collection('users').doc(userRes.data[0]._id).update({
            data: {
              status: 'banned',
              banReason: banReason || '发布违规内容',
              banUntil: null,
              bannedAt: now,
              bannedBy: OPENID,
              updatedAt: now
            }
          });
        }
      }
    }

    // 记录操作日志
    await db.collection('admin_logs').add({
      data: {
        adminOpenId: OPENID,
        action: 'handle_report',
        targetId: reportId,
        details: {
          reportAction: action,
          reply,
          deleteContent,
          banUser,
          targetType: report.type,
          targetContentId: report.targetId
        },
        createdAt: now
      }
    });

    return {
      success: true,
      msg: action === 'resolve' ? '举报已处理' :
           action === 'reject' ? '举报已驳回' : '举报处理中'
    };
  } catch (err) {
    console.error('adminHandleReport error:', err);
    return { success: false, error: err.message };
  }
};
