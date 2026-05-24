const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 检查用户状态（登录时调用）
 * 返回用户是否被封禁/禁言
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  try {
    const { data: users } = await db.collection('users')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (users.length === 0) {
      return { success: true, data: { status: 'normal', canLogin: true } };
    }

    const user = users[0];
    const now = new Date();

    // 检查封禁状态
    if (user.status === 'banned') {
      // 检查是否到期
      if (user.banUntil && new Date(user.banUntil) <= now) {
        // 自动解封
        await db.collection('users').doc(user._id).update({
          data: {
            status: 'normal',
            banReason: '',
            banUntil: null,
            updatedAt: now
          }
        });
        return { success: true, data: { status: 'normal', canLogin: true } };
      }

      return {
        success: true,
        data: {
          status: 'banned',
          canLogin: false,
          banReason: user.banReason || '账号已被封禁',
          banUntil: user.banUntil
        }
      };
    }

    // 检查禁言状态
    if (user.status === 'muted') {
      if (user.muteUntil && new Date(user.muteUntil) <= now) {
        // 自动解除禁言
        await db.collection('users').doc(user._id).update({
          data: {
            status: 'normal',
            muteReason: '',
            muteUntil: null,
            updatedAt: now
          }
        });
        return { success: true, data: { status: 'normal', canLogin: true, canCreate: true } };
      }

      return {
        success: true,
        data: {
          status: 'muted',
          canLogin: true,
          canCreate: false,
          muteReason: user.muteReason || '账号已被禁言',
          muteUntil: user.muteUntil
        }
      };
    }

    return {
      success: true,
      data: {
        status: 'normal',
        canLogin: true,
        canCreate: true
      }
    };
  } catch (err) {
    console.error('checkUserStatus error:', err);
    return { success: false, error: err.message };
  }
};
