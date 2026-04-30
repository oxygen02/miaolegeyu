/**
 * 防抖节流工具函数
 */

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function}
 */
function debounce(fn, delay = 500) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} interval - 间隔时间（毫秒）
 * @returns {Function}
 */
function throttle(fn, interval = 1000) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 带锁的异步函数（防止重复提交）
 * @param {Function} fn - 异步函数
 * @returns {Function}
 */
function withLock(fn) {
  let isLocked = false;
  return async function(...args) {
    if (isLocked) {
      wx.showToast({ title: '操作太频繁，请稍候', icon: 'none' });
      return;
    }
    isLocked = true;
    try {
      return await fn.apply(this, args);
    } finally {
      isLocked = false;
    }
  };
}

module.exports = {
  debounce,
  throttle,
  withLock
};
