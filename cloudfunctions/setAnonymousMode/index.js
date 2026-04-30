const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { roomId, isAnonymous } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 1. 校验登录态
  if (!openid) {
    return { success: false, error: '用户未登录' };
  }

  // 2. 参数校验
  if (!roomId) {
    return { success: false, error: '房间ID不能为空' };
  }

  try {
    // 3. 获取房间信息
    const roomResult = await db.collection('rooms').where({ roomId }).get();
    
    if (roomResult.data.length === 0) {
      return { success: false, error: '房间不存在' };
    }

    const room = roomResult.data[0];

    // 4. 校验房主身份
    if (room.creatorOpenId !== openid) {
      return { success: false, error: '只有房主可以设置匿名模式' };
    }

    // 5. 仅投票中可以修改
    if (room.status !== 'voting') {
      return { success: false, error: '投票已结束，无法修改' };
    }

    // 6. 更新匿名模式
    await db.collection('rooms').doc(room._id).update({
      data: {
        isAnonymous: isAnonymous,
        updatedAt: db.serverDate()
      }
    });

    return { 
      success: true,
      message: isAnonymous ? '已开启匿名模式' : '已关闭匿名模式'
    };

  } catch (err) {
    console.error('setAnonymousMode error:', err);
    return { 
      success: false, 
      error: err.message || '设置失败' 
    };
  }
};
