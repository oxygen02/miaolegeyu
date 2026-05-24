const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 多媒体内容安全检测云函数
 * 支持图片、音频内容检测
 */

/**
 * 下载云存储文件并转换为Buffer
 * @param {string} fileID - 云存储fileID
 * @returns {Promise<Buffer>}
 */
async function downloadCloudFile(fileID) {
  try {
    const res = await cloud.downloadFile({
      fileID: fileID
    });
    return res.fileContent;
  } catch (err) {
    console.error('下载文件失败:', err);
    throw err;
  }
}

/**
 * 检测图片内容
 * @param {string} mediaUrl - 图片云存储fileID或URL
 * @param {string} openid - 用户openid
 * @param {number} scene - 场景值
 * @returns {Promise<object>}
 */
async function checkImage(mediaUrl, openid, scene = 2) {
  try {
    let imageBuffer;
    let contentType = 'image/png';
    
    // 如果是云存储fileID，先下载
    if (mediaUrl.startsWith('cloud://')) {
      imageBuffer = await downloadCloudFile(mediaUrl);
      // 根据fileID后缀判断图片类型
      if (mediaUrl.endsWith('.jpg') || mediaUrl.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (mediaUrl.endsWith('.png')) {
        contentType = 'image/png';
      } else if (mediaUrl.endsWith('.gif')) {
        contentType = 'image/gif';
      } else if (mediaUrl.endsWith('.bmp')) {
        contentType = 'image/bmp';
      }
    } else if (mediaUrl.startsWith('http')) {
      // 如果是HTTP URL，使用异步检测
      return await checkMediaAsync(mediaUrl, 1, openid, scene);
    } else {
      throw new Error('不支持的图片格式');
    }
    
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: contentType,
        value: imageBuffer
      },
      openid: openid,
      scene: scene
    });
    
    // 解析检测结果
    // result.result.suggest: risky/pass/review
    // result.result.label: 100:正常 10001:广告 20001:时政 20002:色情 20003:辱骂 20006:违法犯罪 20008:欺诈 20012:低俗 20013:版权 21000:其他
    const suggest = result.result?.suggest || 'pass';
    const label = result.result?.label || 100;
    
    // 优化：明确返回 pass 或通过时才通过；review 状态视为通过（避免误报）
    // 只有明确返回 risky 才拦截
    const passed = suggest !== 'risky';
    
    return {
      passed: passed,
      suggest: suggest,
      label: label,
      detail: result.result?.detail || null,
      errCode: 0
    };
  } catch (err) {
    console.error('图片检测失败:', err);
    // API调用失败时放行，避免阻塞正常用户
    return {
      passed: true,
      suggest: 'error',
      label: -1,
      errCode: -1,
      errMsg: err.message || '检测失败',
      isError: true  // 标记为API调用错误，非违规内容
    };
  }
}

/**
 * 异步检测媒体内容（支持图片、音频）
 * @param {string} mediaUrl - 媒体文件URL
 * @param {number} mediaType - 1:图片 2:音频 3:视频
 * @param {string} openid - 用户openid
 * @param {number} scene - 场景值
 * @param {string} title - 标题
 * @returns {Promise<object>}
 */
async function checkMediaAsync(mediaUrl, mediaType = 1, openid, scene = 2, title = '') {
  try {
    const result = await cloud.openapi.security.mediaCheckAsync({
      version: 2,
      media_url: mediaUrl,
      media_type: mediaType,
      openid: openid,
      scene: scene,
      title: title
    });
    
    // 异步检测返回trace_id，需要通过msgSecCheck查询结果
    return {
      passed: true, // 异步检测先返回通过，后续通过消息推送获取真实结果
      traceId: result.trace_id,
      errCode: 0,
      isAsync: true
    };
  } catch (err) {
    console.error('媒体异步检测失败:', err);
    return {
      passed: true,
      errCode: -1,
      errMsg: err.message || '检测失败'
    };
  }
}

exports.main = async (event, context) => {
  const { 
    mediaUrl,      // 媒体文件URL或fileID
    mediaType = 1, // 1:图片 2:音频 3:视频
    checkType = 'image', // image:图片检测 media:异步媒体检测
    scene = 2,
    title = ''
  } = event;
  
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!openid) {
    return { code: -1, msg: '未登录' };
  }
  
  if (!mediaUrl) {
    return { code: -1, msg: '媒体文件地址不能为空' };
  }
  
  try {
    let result;
    
    if (checkType === 'image') {
      // 图片检测
      result = await checkImage(mediaUrl, openid, scene);
    } else {
      // 异步媒体检测
      result = await checkMediaAsync(mediaUrl, mediaType, openid, scene, title);
    }
    
    if (!result.passed && !result.isAsync) {
      return {
        code: 403,
        data: result,
        msg: '媒体内容包含违规信息'
      };
    }
    
    return {
      code: 0,
      data: result,
      msg: result.isAsync ? '异步检测已提交' : '媒体内容审核通过'
    };
    
  } catch (err) {
    console.error('媒体检测失败:', err);
    return { code: -1, msg: '检测失败，请稍后重试' };
  }
};
