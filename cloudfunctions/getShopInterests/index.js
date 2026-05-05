const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { shopId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!shopId) {
    return { success: false, error: '缺少店铺ID' };
  }

  try {
    // 查询对该店铺感兴趣的用户（排除发起人自己）
    const interests = await db.collection('shop_dining_interests')
      .where({ 
        shopId: shopId,
        openId: db.command.neq(OPENID) // 排除发起人
      })
      .orderBy('createTime', 'desc')
      .limit(20)
      .get();

    // 获取用户信息
    const interestedUsers = interests.data.map(item => ({
      openId: item.openId,
      createTime: item.createTime
    }));

    return {
      success: true,
      interestedUsers: interestedUsers,
      count: interestedUsers.length
    };
  } catch (err) {
    console.error('获取店铺意向用户失败:', err);
    return { success: false, error: err.message };
  }
};