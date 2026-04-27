const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  console.log('getAvatars called with event:', JSON.stringify(event));
  
  const { category = '', page = 1, pageSize = 200 } = event;

  try {
    console.log('Querying database...');
    // 获取头像列表（最多200个，一次性加载所有）
    const { data: avatars } = await db.collection('avatars')
      .where(category ? { category } : {})
      .orderBy('usageCount', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
    
    console.log('Got avatars:', avatars.length);

    // 直接返回数据，不获取临时链接（避免超时）
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
    console.error('getAvatars error:', err);
    return {
      code: -1,
      success: false,
      data: null,
      msg: err.message || '获取失败'
    };
  }
};
