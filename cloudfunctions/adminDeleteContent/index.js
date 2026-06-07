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
 * 管理员删除内容（活动/店铺/投票）
 * 参数：
 *   - contentType: 'room' | 'shop' | 'vote' | 'appointment' | 'dining'
 *   - contentId: 内容ID
 *   - reason: 删除原因
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const { contentType, contentId, reason = '' } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  if (!contentType || !contentId) {
    return { success: false, error: '缺少内容类型或ID' };
  }

  try {
    const now = new Date();
    let deletedInfo = {};

    switch (contentType) {
      case 'room': {
        // 删除普通投票房间
        const roomRes = await db.collection('rooms').where({ roomId: contentId }).get();
        if (roomRes.data.length === 0) {
          return { success: false, error: '房间不存在或已删除' };
        }
        const room = roomRes.data[0];
        // 级联删除所有关联数据
        await db.collection('rooms').doc(room._id).remove();
        await db.collection('room_participants').where({ roomId: contentId }).remove();
        await db.collection('votes').where({ roomId: contentId }).remove();
        await db.collection('group_order_participants').where({ roomId: contentId }).remove();
        deletedInfo = { title: room.title, creatorOpenId: room.creatorOpenId };
        break;
      }

      case 'shop': {
        // 删除店铺
        const shopRes = await db.collection('shops').doc(contentId).get();
        if (!shopRes.data) {
          return { success: false, error: '店铺不存在' };
        }
        await db.collection('shops').doc(contentId).remove();
        deletedInfo = { title: shopRes.data.name, creatorOpenId: shopRes.data.creatorOpenId };
        break;
      }

      case 'vote':
      case 'scheduleVote': {
        // 删除时间投票
        const voteRes = await db.collection('schedule_votes').doc(contentId).get();
        if (!voteRes.data) {
          return { success: false, error: '投票不存在' };
        }
        // 级联删除关联数据
        await db.collection('schedule_votes').doc(contentId).remove();
        await db.collection('schedule_vote_participants').where({ voteId: contentId }).remove();
        await db.collection('schedule_vote_records').where({ voteId: contentId }).remove();
        deletedInfo = { title: voteRes.data.title, creatorOpenId: voteRes.data.creatorOpenId };
        break;
      }

      case 'appointment':
      case 'dining': {
        // 删除约饭活动
        const aptRes = await db.collection('dining_appointments').doc(contentId).get();
        if (!aptRes.data) {
          return { success: false, error: '活动不存在' };
        }
        // 级联删除关联数据
        await db.collection('dining_appointments').doc(contentId).remove();
        await db.collection('dining_appointment_participants').where({ appointmentId: contentId }).remove();
        deletedInfo = { title: aptRes.data.shopName, creatorOpenId: aptRes.data.initiatorOpenId };
        break;
      }

      default:
        return { success: false, error: '未知内容类型' };
    }

    // 记录操作日志
    await db.collection('admin_logs').add({
      data: {
        adminOpenId: OPENID,
        action: 'delete_content',
        targetId: contentId,
        details: {
          contentType,
          reason,
          ...deletedInfo
        },
        createdAt: now
      }
    });

    return {
      success: true,
      msg: '内容已删除',
      data: deletedInfo
    };
  } catch (err) {
    console.error('adminDeleteContent error:', err);
    return { success: false, error: err.message };
  }
};
