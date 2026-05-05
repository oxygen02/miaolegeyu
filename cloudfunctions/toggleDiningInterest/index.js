const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { shopId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!shopId) {
    return { success: false, error: '缺少店铺ID' };
  }

  try {
    // 查询是否已存在意向
    const existing = await db.collection('shop_dining_interests')
      .where({
        shopId: shopId,
        openId: OPENID
      })
      .get();

    if (existing.data.length > 0) {
      // 已存在，取消意向
      await db.collection('shop_dining_interests')
        .doc(existing.data[0]._id)
        .remove();

      return {
        success: true,
        isInterested: false,
        message: '已取消约饭意向'
      };
    } else {
      // 不存在，添加意向
      await db.collection('shop_dining_interests').add({
        data: {
          shopId: shopId,
          openId: OPENID,
          createTime: new Date()
        }
      });

      return {
        success: true,
        isInterested: true,
        message: '已标记约饭意向'
      };
    }
  } catch (err) {
    console.error('操作约饭意向失败:', err);
    return { success: false, error: err.message };
  }
};