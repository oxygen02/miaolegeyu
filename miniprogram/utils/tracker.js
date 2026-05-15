/**
 * 数据统计与性能监控
 * 集成微信官方数据分析 + 自定义埋点
 */

const app = getApp();

// 页面性能数据
const perfData = {};

/**
 * 初始化性能监控
 */
function initPerformanceMonitor() {
  if (!wx.canIUse('getPerformance')) return;
  
  const performance = wx.getPerformance();
  const observer = performance.createObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`[性能] ${entry.name}: ${entry.duration}ms`);
    });
  });
  observer.observe({ entryTypes: ['navigation', 'render'] });
}

/**
 * 页面开始计时
 */
function pageStart(pageName) {
  perfData[pageName] = {
    startTime: Date.now(),
    path: pageName
  };
}

/**
 * 页面结束计时
 */
function pageEnd(pageName) {
  const data = perfData[pageName];
  if (!data) return;
  
  const duration = Date.now() - data.startTime;
  console.log(`[页面性能] ${pageName}: ${duration}ms`);
  
  // 上报到云函数（可选）
  if (duration > 2000) {
    console.warn(`[性能警告] ${pageName} 加载过慢: ${duration}ms`);
  }
}

/**
 * 自定义事件埋点
 */
function trackEvent(eventName, params = {}) {
  const data = {
    event: eventName,
    params,
    timestamp: Date.now(),
    path: getCurrentPagePath(),
    userInfo: app.globalData.auth?.getUserInfo() || {}
  };
  
  console.log('[埋点]', data);
  
  // 批量上报（每10条上报一次）
  let events = wx.getStorageSync('tracker_events') || [];
  events.push(data);
  
  if (events.length >= 10) {
    reportEvents(events);
    events = [];
  }
  wx.setStorageSync('tracker_events', events);
}

/**
 * 上报事件到云函数
 */
function reportEvents(events) {
  wx.cloud.callFunction({
    name: 'trackEvent',
    data: { events },
    success: () => {
      wx.removeStorageSync('tracker_events');
    },
    fail: (err) => {
      console.error('埋点上报失败:', err);
    }
  });
}

/**
 * 获取当前页面路径
 */
function getCurrentPagePath() {
  const pages = getCurrentPages();
  return pages.length > 0 ? pages[pages.length - 1].route : '';
}

/**
 * 上报错误
 */
function trackError(error, context = {}) {
  console.error('[错误上报]', error, context);
  
  wx.cloud.callFunction({
    name: 'trackEvent',
    data: {
      events: [{
        event: 'error',
        params: {
          message: error.message || error,
          stack: error.stack || '',
          context
        },
        timestamp: Date.now(),
        path: getCurrentPagePath()
      }]
    }
  });
}

module.exports = {
  initPerformanceMonitor,
  pageStart,
  pageEnd,
  trackEvent,
  trackError,
  reportEvents
};