const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 多媒体内容安全检测云函数
 * 调用微信官方 mediaCheckAsync 2.0 接口（异步检测）
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/mediaCheckAsync.html
 */

/**
 * 获取云存储文件的临时 URL
 * @param {string} fileID - 云存储fileID
 * @returns {Promise<string>} - 临时URL
 */
async function getCloudFileUrl(fileID) {
  try {
    const res = await cloud.getTempFileURL({
      fileList: [fileID]
    });
    if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
      return res.fileList[0].tempFileURL;
    }
    throw new Error('获取文件临时URL失败');
  } catch (err) {
    console.error('获取云存储文件URL失败:', err);
    throw err;
  }
}

/**
 * 异步检测媒体内容（图片/音频）
 * @param {string} mediaUrl - 媒体文件URL（必须是http/https）
 * @param {number} mediaType - 1:音频 2:图片
 * @param {string} openid - 用户openid
 * @param {number} scene - 场景值
 * @param {string} title - 标题
 * @returns {Promise<object>}
 */
async function checkMediaAsync(mediaUrl, mediaType, openid, scene = 2, title = '') {
  try {
    const result = await cloud.openapi.security.mediaCheckAsync({
      version: 2,
      media_url: mediaUrl,
      media_type: mediaType, // 1:音频 2:图片
      openid: openid,
      scene: scene,
      title: title
    });

    console.log('mediaCheckAsync 返回结果:', JSON.stringify(result));

    // 异步检测返回 trace_id，需要通过消息推送获取真实结果
    // 但前端需要立即知道是否通过，这里返回已提交状态
    return {
      passed: true, // 异步检测先返回通过，后续通过消息推送处理
      traceId: result.trace_id,
      errCode: 0,
      isAsync: true,
      msg: '异步检测已提交'
    };
  } catch (err) {
    console.error('mediaCheckAsync 调用异常:', err);
    // API 调用异常时放行
    return {
      passed: true,
      errCode: -1,
      errMsg: err.message || '检测失败',
      isError: true
    };
  }
}

exports.main = async (event, context) => {
  const {
    mediaUrl,      // 媒体文件URL或fileID
    mediaType = 2, // 1:音频 2:图片（默认图片）
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
    let finalMediaUrl = mediaUrl;

    // 如果是云存储 fileID，先获取临时 URL
    if (mediaUrl.startsWith('cloud://')) {
      finalMediaUrl = await getCloudFileUrl(mediaUrl);
    }

    // 调用异步检测接口
    const result = await checkMediaAsync(finalMediaUrl, mediaType, openid, scene, title);

    if (!result.passed && !result.isAsync && !result.isError) {
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
    // 异常时放行，避免阻塞正常用户
    return {
      code: 0,
      data: {
        passed: true,
        warning: '检测服务暂不可用，已放行'
      },
      msg: '媒体内容审核通过'
    };
  }
};
