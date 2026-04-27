const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    // 获取所有头像
    const { data: avatars } = await db.collection('avatars').get();
    
    // 删除所有头像
    const deletePromises = avatars.map(item => 
      db.collection('avatars').doc(item._id).remove()
    );
    
    await Promise.all(deletePromises);
    
    return {
      code: 0,
      msg: `已清空 ${avatars.length} 个头像`,
      data: { count: avatars.length }
    };
  } catch (err) {
    console.error('clearAvatars error:', err);
    return {
      code: -1,
      msg: err.message || '清空失败'
    };
  }
};
