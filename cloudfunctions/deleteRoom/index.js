const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;

  // 1. 校验登录态
  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  // 2. 参数校验
  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  try {
    // 3. 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).get();
    if (roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = roomResult.data[0];

    // 4. 权限校验：只有房主可以删除
    if (room.creatorOpenId !== wxContext.OPENID) {
      return { code: 403, msg: '只有房主可以删除房间' };
    }

    // 5. 使用事务删除房间及相关数据
    const transaction = await db.startTransaction();

    try {
      // 删除房间的参与者记录
      await transaction.collection('room_participants').where({ roomId }).remove();

      // 删除房间的投票记录
      await transaction.collection('votes').where({ roomId }).remove();

      // 删除房间本身
      await transaction.collection('rooms').doc(room._id).remove();

      await transaction.commit();

      return {
        code: 0,
        msg: '删除成功'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (err) {
    console.error('deleteRoom error:', err);
    return {
      code: -1,
      msg: err.message || '删除失败'
    };
  }
};
