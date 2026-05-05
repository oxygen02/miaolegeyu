/**
 * 云函数调用统一封装
 * 包含：loading管理、错误处理、统一返回格式
 */

// 存储当前loading计数（支持多个并发调用）
let loadingCount = 0;

/**
 * 显示/隐藏全局loading
 */
function showLoading(title = '加载中...') {
  if (loadingCount === 0) {
    wx.showLoading({ title, mask: true });
  }
  loadingCount++;
}

function hideLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) {
    wx.hideLoading();
  }
}

/**
 * 统一云函数调用
 * @param {string} name - 云函数名称
 * @param {object} data - 调用参数
 * @param {object} options - 配置项
 * @param {boolean} options.showLoading - 是否显示loading，默认true
 * @param {string} options.loadingText - loading文案
 * @param {boolean} options.showError - 是否自动显示错误提示，默认true
 * @returns {Promise<object>} 云函数返回结果
 */
async function callCloudFunction(name, data = {}, options = {}) {
  const { showLoading: showLoad = true, loadingText = '加载中...', showError = true } = options;
  
  try {
    if (showLoad) showLoading(loadingText);
    
    const res = await wx.cloud.callFunction({
      name,
      data
    });
    
    const result = res.result || {};
    
    // 检查业务错误码
    if (result.code && result.code !== 0) {
      throw new Error(result.msg || '操作失败');
    }
    
    return {
      success: true,
      data: result.data,
      msg: result.msg || '操作成功',
      code: result.code || 0
    };
  } catch (err) {
    console.error(`云函数[${name}]调用失败:`, err);
    
    const errorMsg = err.message || '网络异常，请稍后重试';
    
    if (showError) {
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
    }
    
    return {
      success: false,
      data: null,
      msg: errorMsg,
      code: -1
    };
  } finally {
    if (showLoad) hideLoading();
  }
}

/**
 * 不显示loading的云函数调用（用于后台静默操作）
 */
async function callSilent(name, data = {}, showError = false) {
  return callCloudFunction(name, data, { showLoading: false, showError });
}

module.exports = {
  callCloudFunction,
  callSilent
};
