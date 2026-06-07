/**
 * 全局预加载管理器
 * 
 * 核心思路：
 * - 用户在页面A操作时，后台静默预加载页面B的数据
 * - 当用户切到页面B时，直接用缓存数据秒开，然后后台刷新
 * 
 * 使用方式：
 *   const preload = require('./preloadManager');
 *   // 预加载数据
 *   preload.warmUp('fish-tank');
 *   // 获取缓存数据
 *   const data = preload.getCache('fish-tank');
 *   // 标记数据已消费
 *   preload.consume('fish-tank');
 */

// 缓存配置
const CACHE_CONFIG = {
  'fish-tank': {
    key: 'fish_ongoing_all',           // 主缓存 key
    timeKey: 'fish_ongoing_all_time',   // 时间 key
    expiry: 60 * 1000,                  // 缓存有效期 60 秒（比页面的 3 秒长很多）
    loaders: [],                        // 预加载函数列表
    _loading: false,                    // 是否正在加载
    _lastLoadTime: 0                    // 上次加载时间
  },
  'fish-tank-my': {
    key: 'fish_my_all',
    timeKey: 'fish_my_all_time',
    expiry: 60 * 1000,
    loaders: [],
    _loading: false,
    _lastLoadTime: 0
  },
  'fish-tank-participated': {
    key: 'fish_participated_all',
    timeKey: 'fish_participated_all_time',
    expiry: 60 * 1000,
    loaders: [],
    _loading: false,
    _lastLoadTime: 0
  }
};

// 预加载任务队列（用于 idle 时执行）
const _preloadQueue = new Set();
let _idleCallbackId = null;
let _isIdle = false;
let _lastInteractionTime = Date.now(); // 模块级：touch() 和 startIdleScheduler 都能访问

/**
 * 注册预加载器
 * @param {string} namespace - 命名空间，如 'fish-tank'
 * @param {Function} loader - 异步加载函数，返回要缓存的数据
 */
function registerLoader(namespace, loader) {
  const config = CACHE_CONFIG[namespace];
  if (!config) {
    console.warn('[Preload] 未知命名空间:', namespace);
    return;
  }
  config.loaders.push(loader);
}

/**
 * 预热：在用户不感知的情况下后台加载数据
 * 不强求成功，失败静默忽略
 * @param {string} namespace - 命名空间
 * @param {Object} options - { force: boolean } 是否强制刷新
 */
async function warmUp(namespace, options = {}) {
  const config = CACHE_CONFIG[namespace];
  if (!config) return;

  const { force = false } = options;
  const now = Date.now();

  // 防重复：如果正在加载中，且不是强制刷新，跳过
  if (config._loading && !force) return;

  // 防频繁：如果上次加载不到 5 秒前，跳过（除非强制）
  if (!force && now - config._lastLoadTime < 5000) return;

  config._loading = true;
  config._lastLoadTime = now;

  try {
    // 执行所有注册的加载器
    const results = await Promise.allSettled(
      config.loaders.map(loader => loader())
    );

    // 收集成功的结果
    const data = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        Object.assign(data, result.value);
      }
    });

    // 如果有有效数据，写入缓存
    if (Object.keys(data).length > 0) {
      wx.setStorageSync(config.key, data);
      wx.setStorageSync(config.timeKey, now);
      console.log(`[Preload] ${namespace} 预热完成`);
    }
  } catch (err) {
    console.warn(`[Preload] ${namespace} 预热失败（静默忽略）:`, err.message);
  } finally {
    config._loading = false;
  }
}

/**
 * 获取预加载缓存数据
 * @param {string} namespace - 命名空间
 * @returns {Object|null} 缓存的数据，或 null
 */
function getCache(namespace) {
  const config = CACHE_CONFIG[namespace];
  if (!config) return null;

  try {
    const cached = wx.getStorageSync(config.key);
    const cachedTime = wx.getStorageSync(config.timeKey);

    if (cached && cachedTime && (Date.now() - cachedTime < config.expiry)) {
      return cached;
    }
  } catch (e) {
    // 忽略
  }

  return null;
}

/**
 * 检查是否有可用缓存
 * @param {string} namespace
 * @returns {boolean}
 */
function hasCache(namespace) {
  return getCache(namespace) !== null;
}

/**
 * 标记缓存已被消费（页面已读取）
 * 可选：消费后自动触发下一轮预热
 * @param {string} namespace
 */
function consume(namespace) {
  // 消费后，可以在后台静默触发一次刷新（延长下次有效期）
  // 这里不做额外操作，仅标记
  console.log(`[Preload] ${namespace} cache consumed`);
}

/**
 * 使指定命名空间的缓存失效
 * @param {string} namespace
 */
function invalidate(namespace) {
  const config = CACHE_CONFIG[namespace];
  if (!config) return;

  try {
    wx.removeStorageSync(config.key);
    wx.removeStorageSync(config.timeKey);
  } catch (e) {}
  
  console.log(`[Preload] ${namespace} cache invalidated`);
}

/**
 * 使所有缓存失效
 */
function invalidateAll() {
  Object.keys(CACHE_CONFIG).forEach(invalidate);
}

/**
 * 启动 Idle 预加载调度器
 * 当浏览器/小程序空闲时，自动执行预加载队列中的任务
 */
function startIdleScheduler() {
  if (_idleCallbackId) return; // 已启动

  // 小程序中使用定时器模拟 idle 检测
  // 检测间隔：用户无操作 3 秒后开始预加载
  _idleCallbackId = setInterval(() => {
    const now = Date.now();
    
    // 如果距上次交互超过 3 秒，认为处于 idle 状态
    if (now - _lastInteractionTime > 3000) {
      if (!_isIdle) {
        _isIdle = true;
        _executePreloadQueue();
      }
    } else {
      _isIdle = false;
    }
  }, 2000);

}

/**
 * 记录用户交互时间（在页面 onShow / onTouchStart 中调用）
 */
function touch() {
  _lastInteractionTime = Date.now();
}

/**
 * 执行预加载队列
 */
async function _executePreloadQueue() {
  for (const namespace of _preloadQueue) {
    // 如果已有有效缓存，跳过
    if (hasCache(namespace)) continue;
    
    await warmUp(namespace);
    
    // 每次预加载间隔一小段时间，避免占用过多资源
    await new Promise(r => setTimeout(r, 500));
  }
}

/**
 * 将命名空间加入预加载队列
 * @param {string} namespace
 */
function enqueue(namespace) {
  _preloadQueue.add(namespace);
}

/**
 * 从预加载队列移除
 * @param {string} namespace
 */
function dequeue(namespace) {
  _preloadQueue.delete(namespace);
}

/**
 * 智能预加载：根据当前页面，预加载用户可能下一个访问的页面数据
 * @param {string} currentPage - 当前页面路径
 */
function smartPreload(currentPage) {
  // 用户在首页 → 预加载喵不喵数据
  if (currentPage.includes('index/index')) {
    enqueue('fish-tank');
    enqueue('fish-tank-my');
    enqueue('fish-tank-participated');
    _executePreloadQueue(); // 立即开始预加载
  }
  
  // 用户在我的 → 预加载喵不喵数据
  if (currentPage.includes('profile/profile')) {
    enqueue('fish-tank');
    enqueue('fish-tank-my');
    enqueue('fish-tank-participated');
    _executePreloadQueue();
  }
  
  // 用户在喵不喵 → 预加载 profile 统计数据
  if (currentPage.includes('fish-tank')) {
    // 可以预加载 profile 的统计数据
  }
}

module.exports = {
  registerLoader,
  warmUp,
  getCache,
  hasCache,
  consume,
  invalidate,
  invalidateAll,
  startIdleScheduler,
  touch,
  enqueue,
  dequeue,
  smartPreload
};
