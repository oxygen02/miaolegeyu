const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  const { scene, page = 'pages/vote/vote', width = 280 } = event;
  
  if (!scene) {
    return { code: -1, msg: 'scene参数不能为空' };
  }

  try {
    // 生成小程序码
    const result = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page,
      width,
      autoColor: false,
      lineColor: {
        r: 255,
        g: 159,
        b: 67
      },
      isHyaline: false
    });

    // 上传到云存储
    const uploadResult = await cloud.uploadFile({
      cloudPath: `qrcodes/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`,
      fileContent: result.buffer
    });

    // 获取临时链接
    const fileResult = await cloud.getTempFileURL({
      fileList: [uploadResult.fileID]
    });

    if (fileResult.fileList && fileResult.fileList[0]) {
      return {
        code: 0,
        data: fileResult.fileList[0].tempFileURL,
        msg: '生成成功'
      };
    }

    return { code: -1, msg: '获取图片链接失败' };
  } catch (err) {
    console.error('生成小程序码失败:', err);
    return { code: -1, msg: err.message || '生成失败' };
  }
};
