const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { startIndex = 0, batchSize = 10 } = event;
  
  try {
    // 获取需要修复的头像（imageUrl 不包含 http 的）
    const { data: allAvatars } = await db.collection('avatars')
      .skip(startIndex)
      .limit(batchSize)
      .get();
    
    // 过滤出需要修复的（imageUrl 不以 http 开头）
    const avatars = allAvatars.filter(item => 
      !item.imageUrl || !item.imageUrl.startsWith('http')
    );
    
    if (avatars.length === 0) {
      return {
        code: 0,
        msg: '没有需要修复的头像',
        data: { hasMore: false }
      };
    }
    
    // 获取临时链接
    const fileList = avatars.map(item => item.cloudPath).filter(Boolean);
    const { fileList: urlList } = await cloud.getTempFileURL({
      fileList: fileList
    });
    
    // 更新数据库
    const updatePromises = avatars.map((item, index) => {
      return db.collection('avatars').doc(item._id).update({
        data: {
          imageUrl: urlList[index]?.tempFileURL || item.cloudPath
        }
      });
    });
    
    await Promise.all(updatePromises);
    
    return {
      code: 0,
      msg: `修复完成 ${avatars.length} 条`,
      data: {
        fixed: avatars.length,
        hasMore: avatars.length === batchSize
      }
    };
  } catch (err) {
    console.error('fixAvatarUrls error:', err);
    return {
      code: -1,
      msg: err.message || '修复失败'
    };
  }
};
