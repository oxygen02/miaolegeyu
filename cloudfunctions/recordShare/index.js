const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 记录分享/邀请事件
 * 每次用户触发分享时调用，记录到 share_records 集合
 * 
 * event 参数:
 * - roomId: 房间ID
 * - shareType: 分享类型 'friend' | 'timeline' | 'copy' | 'invite'
 * - source: 触发来源 'control_invite' | 'control_remind' | 'fish-tank' 等
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, shareType = 'friend', source = 'control' } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 同一用户同一房间同一类型，10秒内去重（防止重复点击）
    const recentRecord = await db.collection('share_records')
      .where({
        roomId,
        sharerOpenId: wxContext.OPENID,
        shareType,
        createTime: _.gte(new Date(Date.now() - 10000))
      })
      .count();

    if (recentRecord.total > 0) {
      return { code: 0, msg: 'ok', duplicated: true };
    }

    // 写入分享记录
    await db.collection('share_records').add({
      data: {
        roomId,
        sharerOpenId: wxContext.OPENID,
        shareType,       // friend=好友, timeline=朋友圈, copy=复制链接, invite=邀请按钮
        source,          // 触发来源页面/按钮
        createTime: db.serverDate()
      }
    });

    return { code: 0, msg: '记录成功' };
  } catch (err) {
    console.error('[recordShare] error:', err);
    return { code: -1, msg: '记录失败' };
  }
};
