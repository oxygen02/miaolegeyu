const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 批量导入头像数据
 * @param {Array} avatarData - 头像数据数组
 *   [
 *     {
 *       category: '橘猫',
 *       name: '橘猫-金色',
 *       cloudPath: 'avatars/cat_01_橘猫/golden.jpg'
 *     }
 *   ]
 */
exports.main = async (event) => {
  const { avatarData } = event;
  
  if (!avatarData || !Array.isArray(avatarData)) {
    return {
      code: -1,
      msg: '请提供头像数据数组'
    };
  }
  
  try {
    const results = [];
    const errors = [];
    
    for (const item of avatarData) {
      try {
        // 获取云存储文件的临时链接
        const { fileList } = await cloud.getTempFileURL({
          fileList: [item.cloudPath]
        });
        
        if (!fileList || fileList.length === 0 || !fileList[0].tempFileURL) {
          throw new Error('获取文件链接失败');
        }
        
        // 添加到数据库
        const result = await db.collection('avatars').add({
          data: {
            category: item.category,
            name: item.name,
            imageUrl: fileList[0].tempFileURL,
            cloudPath: item.cloudPath,
            usageCount: 0,
            createTime: db.serverDate()
          }
        });
        
        results.push({
          id: result._id,
          name: item.name,
          success: true
        });
        
      } catch (err) {
        errors.push({
          name: item.name,
          error: err.message
        });
      }
    }
    
    return {
      code: 0,
      msg: `导入完成：成功 ${results.length} 条，失败 ${errors.length} 条`,
      data: {
        success: results.length,
        failed: errors.length,
        results,
        errors
      }
    };
    
  } catch (err) {
    console.error('batchImportAvatars error:', err);
    return {
      code: -1,
      msg: err.message || '导入失败'
    };
  }
};
