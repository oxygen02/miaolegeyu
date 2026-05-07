const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { category = '', page = 1, pageSize = 200 } = event;

  try {
    const { data: avatars } = await db.collection('avatars')
      .where(category ? { category } : {})
      .orderBy('usageCount', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      success: true,
      data: {
        avatars,
        hasMore: avatars.length === pageSize
      },
      msg: '获取成功'
    };
  } catch (err) {
    return {
      code: -1,
      success: false,
      data: null,
      msg: err.message || '获取失败'
    };
  }
};
