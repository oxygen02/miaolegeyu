const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 实际的文件名列表（根据云存储中的文件名）
const actualFileNames = [
  "01_三花吉祥.png",
  "01_乳白可爱.png",
  "01_乳白圆润.png",
  "01_乳黄卷毛.png",
  "01_梵花清爽.png",
  "01_棕虎斑野性.png",
  // 请继续添加其他文件名...
];

exports.main = async (event) => {
  const { startIndex = 0, batchSize = 10 } = event;
  
  try {
    // 获取头像列表
    const { data: avatars } = await db.collection('avatars')
      .skip(startIndex)
      .limit(batchSize)
      .get();
    
    if (avatars.length === 0) {
      return {
        code: 0,
        msg: '没有更多头像',
        data: { hasMore: false }
      };
    }
    
    // 更新每个头像的 cloudPath
    const updatePromises = avatars.map((item, index) => {
      const fileName = actualFileNames[startIndex + index];
      if (fileName) {
        return db.collection('avatars').doc(item._id).update({
          data: {
            cloudPath: `avatars/cat/${fileName}`,
            name: fileName.replace('.png', '')
          }
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(updatePromises);
    
    return {
      code: 0,
      msg: `更新完成 ${avatars.length} 条`,
      data: {
        updated: avatars.length,
        hasMore: avatars.length === batchSize
      }
    };
  } catch (err) {
    console.error('updateAvatarPaths error:', err);
    return {
      code: -1,
      msg: err.message || '更新失败'
    };
  }
};
