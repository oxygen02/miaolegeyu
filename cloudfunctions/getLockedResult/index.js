const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
    // 获取房间信息
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return { code: -1, msg: '房间不存在' };
    }

    const room = roomResult.data[0];

    // 权限校验
    const isCreator = room.creatorOpenId === wxContext.OPENID;
    if (!isCreator) {
      return { code: 403, msg: '只有房主可查看锁定结果' };
    }

    // 检查房间是否已锁定
    if (room.status !== 'locked') {
      return { code: -1, msg: '房间尚未锁定' };
    }

    // 获取锁定结果
    const result = room.lockedResult || {};
    
    // 计算支持率
    const participants = await db.collection('room_participants')
      .where({ roomId })
      .get();
    
    const totalCount = participants.data.length;
    const voteCount = result.voteCount || 0;
    const votePercent = totalCount > 0 ? Math.round((voteCount / totalCount) * 100) : 0;

    return {
      code: 0,
      data: {
        winner: {
          name: result.name || result.shopName || '未知',
          address: result.address || '',
          category: result.category || '',
          price: result.price || 0,
          image: result.image || result.imageUrl || '/images/shop_demo.jpg',
          voteCount: voteCount,
          votePercent: votePercent,
          lockedAt: result.lockedAt || room.updatedAt
        }
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getLockedResult error:', err);
    return { code: -1, msg: err.message || '获取锁定结果失败' };
  }
};
