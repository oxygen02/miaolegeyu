const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { fileList } = event;
  
  if (!fileList || !Array.isArray(fileList) || fileList.length === 0) {
    return { code: -1, msg: '文件列表不能为空' };
  }

  try {
    // 获取临时文件 URL
    const result = await cloud.getTempFileURL({
      fileList: fileList
    });

    return {
      code: 0,
      fileList: result.fileList || []
    };
  } catch (err) {
    console.error('获取临时文件 URL 失败:', err);
    return { code: -1, msg: err.message };
  }
};
