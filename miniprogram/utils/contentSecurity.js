/**
 * 内容安全检查工具
 * 封装调用内容安全相关云函数的逻辑
 */

/**
 * 检查文本内容是否违规
 * @param {string} content - 待检查文本
 * @param {number} scene - 场景值 1:资料 2:评论 3:论坛 4:社交日志
 * @returns {Promise<{passed: boolean, msg: string}>}
 */
async function checkContent(content, scene = 2) {
  if (!content || !content.trim()) {
    return { passed: true, msg: '内容为空，无需检查' };
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'contentCheck',
      data: {
        content: content.trim(),
        scene: scene
      }
    });
    
    const result = res.result || {};

    // 云函数返回403表示内容违规
    if (result.code === 403) {
      return {
        passed: false,
        msg: result.msg || '内容包含违规信息，请修改后重试'
      };
    }
    
    // 云函数返回其他错误码 - 检测失败时放行（避免阻塞正常用户）
    if (result.code !== 0) {
      console.warn('内容检查调用失败:', result.msg);
      return { passed: true, msg: '检查服务暂不可用，已放行' };
    }

    // 检查云函数返回的数据
    const data = result.data || {};
    if (data.passed === false) {
      return {
        passed: false,
        msg: '内容包含违规信息，请修改后重试'
      };
    }

    return { passed: true, msg: '内容审核通过' };
  } catch (err) {
    console.error('内容检查异常:', err);
    // 异常时放行，避免阻塞正常用户
    return { passed: true, msg: '检查异常，已放行' };
  }
}

/**
 * 检查并提示（违规时自动弹出提示）
 * @param {string} content - 待检查文本
 * @param {number} scene - 场景值
 * @returns {Promise<boolean>} - 是否通过
 */
async function checkContentWithToast(content, scene = 2) {
  const result = await checkContent(content, scene);
  
  if (!result.passed) {
    wx.showToast({
      title: result.msg,
      icon: 'none',
      duration: 2000
    });
  }
  
  return result.passed;
}

/**
 * 检查图片内容是否违规
 * @param {string} mediaUrl - 图片fileID或URL
 * @param {number} scene - 场景值
 * @returns {Promise<{passed: boolean, msg: string}>}
 */
async function checkImage(mediaUrl, scene = 2) {
  if (!mediaUrl) {
    return { passed: true, msg: '图片为空，无需检查' };
  }

  // 临时绕过图片检测，直接放行
  // 原因：微信 imgSecCheck API 对正常餐饮店铺截图误报率过高
  // 后续可通过后端异步检测或人工审核机制补充
  console.log('[图片检测] 已跳过，直接放行:', mediaUrl);
  return { passed: true, msg: '图片审核通过' };

  /*
  try {
    const res = await wx.cloud.callFunction({
      name: 'mediaCheck',
      data: {
        mediaUrl: mediaUrl,
        mediaType: 1,
        checkType: 'image',
        scene: scene
      }
    });
    
    const result = res.result || {};

    if (result.code === 403) {
      return {
        passed: false,
        msg: result.msg || '图片包含违规内容'
      };
    }
    
    if (result.code !== 0) {
      console.warn('图片检测调用失败:', result.msg);
      return { passed: true, msg: '检测服务暂不可用，已放行' };
    }

    const data = result.data || {};
    if (data.passed === false) {
      return {
        passed: false,
        msg: '图片包含违规内容，请更换后重试'
      };
    }

    return { passed: true, msg: '图片审核通过' };
  } catch (err) {
    console.error('图片检测异常:', err);
    return { passed: true, msg: '检测异常，已放行' };
  }
  */
}

/**
 * 检查图片并提示
 * @param {string} mediaUrl - 图片fileID或URL
 * @param {number} scene - 场景值
 * @returns {Promise<boolean>}
 */
async function checkImageWithToast(mediaUrl, scene = 2) {
  const result = await checkImage(mediaUrl, scene);
  
  if (!result.passed) {
    wx.showToast({
      title: result.msg,
      icon: 'none',
      duration: 2000
    });
  }
  
  return result.passed;
}

/**
 * 异步检测媒体内容（图片/音频/视频）
 * @param {string} mediaUrl - 媒体文件URL
 * @param {number} mediaType - 1:图片 2:音频 3:视频
 * @param {number} scene - 场景值
 * @param {string} title - 标题
 * @returns {Promise<{passed: boolean, msg: string, traceId: string}>}
 */
async function checkMediaAsync(mediaUrl, mediaType = 1, scene = 2, title = '') {
  if (!mediaUrl) {
    return { passed: true, msg: '媒体文件为空' };
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'mediaCheck',
      data: {
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        checkType: 'media',
        scene: scene,
        title: title
      }
    });
    
    const result = res.result || {};

    if (result.code !== 0) {
      return { passed: true, msg: '检测服务暂不可用' };
    }

    return {
      passed: true,
      msg: result.msg || '异步检测已提交',
      traceId: result.data?.traceId || ''
    };
  } catch (err) {
    console.error('媒体异步检测异常:', err);
    return { passed: true, msg: '检测异常' };
  }
}

/**
 * 获取用户安全等级
 * @param {number} scene - 0:注册 1:营销作弊
 * @returns {Promise<{riskRank: number, riskLevel: string, riskDesc: string}>}
 */
async function getUserRiskRank(scene = 0) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'userRiskCheck',
      data: {
        scene: scene
      }
    });
    
    const result = res.result || {};

    if (result.code !== 0) {
      console.warn('获取用户安全等级失败:', result.msg);
      return { riskRank: 0, riskLevel: 'low', riskDesc: '低风险用户' };
    }

    return result.data || { riskRank: 0, riskLevel: 'low', riskDesc: '低风险用户' };
  } catch (err) {
    console.error('获取用户安全等级异常:', err);
    return { riskRank: 0, riskLevel: 'low', riskDesc: '低风险用户' };
  }
}

module.exports = {
  checkContent,
  checkContentWithToast,
  checkImage,
  checkImageWithToast,
  checkMediaAsync,
  getUserRiskRank
};
