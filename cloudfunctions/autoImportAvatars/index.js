const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 自动导入云存储中的头像到数据库（支持分批）
 * 使用预定义的文件名列表
 */
exports.main = async (event) => {
  const { 
    category = 'cat',
    startIndex = 0,
    batchSize = 10, // 减小批次大小避免超时
    fileList = [] // 传入文件列表
  } = event;
  
  try {
    // 如果没有传入文件列表，返回错误
    if (!fileList || fileList.length === 0) {
      return {
        code: -1,
        msg: '请提供文件列表'
      };
    }
    
    const total = fileList.length;
    console.log(`总共 ${total} 个文件`);
    
    // 获取当前批次
    const endIndex = Math.min(startIndex + batchSize, total);
    const currentBatch = fileList.slice(startIndex, endIndex);
    
    if (currentBatch.length === 0) {
      return {
        code: 0,
        msg: '没有更多文件',
        data: {
          imported: startIndex,
          total,
          hasMore: false
        }
      };
    }
    
    // 获取临时链接
    const { fileList: urlList } = await cloud.getTempFileURL({
      fileList: currentBatch.map(f => f.cloudPath)
    });
    
    // 批量添加到数据库
    const results = [];
    const errors = [];
    
    for (let i = 0; i < currentBatch.length; i++) {
      try {
        const file = currentBatch[i];
        const urlItem = urlList[i];
        
        // 检查是否已存在
        const { data: existing } = await db.collection('avatars')
          .where({ cloudPath: file.cloudPath })
          .limit(1)
          .get();
        
        if (existing && existing.length > 0) {
          // 已存在，跳过
          results.push({
            name: file.name,
            success: true,
            skipped: true
          });
          continue;
        }
        
        // 添加到数据库
        const result = await db.collection('avatars').add({
          data: {
            category,
            name: file.name || `头像${startIndex + i + 1}`,
            imageUrl: urlItem.tempFileURL || file.cloudPath,
            cloudPath: file.cloudPath,
            usageCount: 0,
            createTime: db.serverDate()
          }
        });
        
        results.push({
          id: result._id,
          name: file.name,
          success: true
        });
        
      } catch (err) {
        errors.push({
          file: currentBatch[i].cloudPath,
          error: err.message
        });
      }
    }
    
    const imported = startIndex + results.length;
    const hasMore = endIndex < total;
    
    return {
      code: 0,
      msg: `本批导入完成：成功 ${results.length} 条，失败 ${errors.length} 条`,
      data: {
        imported,
        total,
        hasMore,
        batchSuccess: results.filter(r => !r.skipped).length,
        batchSkipped: results.filter(r => r.skipped).length,
        batchFailed: errors.length
      }
    };
    
  } catch (err) {
    console.error('autoImportAvatars error:', err);
    return {
      code: -1,
      msg: err.message || '导入失败'
    };
  }
};
