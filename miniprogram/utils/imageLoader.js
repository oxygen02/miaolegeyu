/**
 * 云存储图片加载工具
 *
 * 策略：
 * 1. 客户端 getTempFileURL（可能返回 STORAGE_FILE_NONEXIST）
 * 2. 云函数 getTempFileURL（服务端可能解析路径不同）
 * 3. 如果都失败，从返回的 CDN 模板 URL + 自行拼接 sign 参数
 *
 * 核心原则：绝不将 cloud:// 原路径泄漏到渲染层
 */

const CACHE_KEY = 'image_url_cache';
const CACHE_EXPIRE = 1.8 * 60 * 60 * 1000; // 1.8小时（临时链接有效期2小时）

class ImageLoader {
  constructor() {
    this._cache = this._loadCache();
    this._pending = {};
  }

  _loadCache() {
    try {
      const cache = wx.getStorageSync(CACHE_KEY);
      if (cache && typeof cache === 'object') {
        const now = Date.now();
        const valid = {};
        Object.entries(cache).forEach(([key, item]) => {
          if (item && item.expire > now) {
            valid[key] = item;
          }
        });
        return valid;
      }
    } catch (e) {}
    return {};
  }

  _saveCache() {
    try { wx.setStorageSync(CACHE_KEY, this._cache); } catch (e) {}
  }

  /**
   * 批量获取临时链接
   */
  async getTempURLs(fileList) {
    if (!fileList || fileList.length === 0) return {};

    const now = Date.now();
    const result = {};
    const needFetch = [];

    // 1. 从缓存中查找
    fileList.forEach(path => {
      const cached = this._cache[path];
      if (cached && cached.expire > now) {
        result[path] = cached.url;
      } else {
        needFetch.push(path);
      }
    });

    if (needFetch.length === 0) return result;

    console.log(`[ImageLoader] 缓存命中 ${Object.keys(result).length}/${fileList.length} 个，需获取 ${needFetch.length} 个`);

    // 2. 去重：检查 pending 中的请求
    const toRequest = [];
    needFetch.forEach(path => {
      if (this._pending[path]) {
        toRequest.push(
          this._pending[path].then(url => { result[path] = url; }).catch(() => {})
        );
      } else {
        toRequest.push(path);
      }
    });

    const pathsToFetch = toRequest.filter(item => typeof item === 'string');
    const pendingPromises = toRequest.filter(item => typeof item !== 'string');

    // 3. 批量获取
    if (pathsToFetch.length > 0) {
      const batchPromise = this._fetchWithFallback(pathsToFetch);
      pathsToFetch.forEach(path => {
        this._pending[path] = batchPromise.then(urls => urls[path]);
      });

      const batchResult = await batchPromise;
      Object.assign(result, batchResult);

      pathsToFetch.forEach(path => { delete this._pending[path]; });
    }

    if (pendingPromises.length > 0) await Promise.all(pendingPromises);

    // 4. 安全网：确保没有 cloud:// 泄漏
    fileList.forEach(path => {
      if (!result[path] || result[path].startsWith('cloud://')) {
        console.warn('[ImageLoader] 图片获取失败:', path);
        result[path] = '';
      }
    });

    const successCount = Object.values(result).filter(v => v && v.startsWith('https://')).length;
    console.log(`[ImageLoader] 最终结果: ${successCount}/${fileList.length} 个成功`);
    return result;
  }

  /**
   * 核心获取逻辑：客户端API → 云函数 → 返回结果（包含成功和失败的）
   */
  async _fetchWithFallback(paths) {
    const result = {};

    // ===== 尝试1: 客户端 getTempFileURL =====
    let res = null;
    try {
      res = await wx.cloud.getTempFileURL({ fileList: paths });
    } catch (e) {
      console.log('[ImageLoader] 客户端API异常:', e.errMsg || e.message);
    }

      if (res && res.fileList) {
      const successList = [];
      const failList = [];

      res.fileList.forEach(item => {
        // 详细日志：打印每个文件的状态
        const status = item.status;
        const errMsg = item.errMsg || '';
        const tempURL = item.tempFileURL || '';
        console.log(`[ImageLoader] 文件详情: fileID=${item.fileID}, status=${status}, errMsg=${errMsg}, tempFileURL=${tempURL ? tempURL.substring(0, 60) + '...' : '空'}`);

        if (item.tempFileURL && item.fileID) {
          result[item.fileID] = item.tempFileURL;
          this._cache[item.fileID] = { url: item.tempFileURL, expire: Date.now() + CACHE_EXPIRE };
          successList.push(item.fileID);
        } else if (item.fileID) {
          failList.push(item);
        }
      });

      if (successList.length > 0) {
        console.log(`[ImageLoader] 客户端API: ${successList.length}成功`);
      }
      if (failList.length > 0) {
        console.log(`[ImageLoader] 客户端API: ${failList.length}失败, 详情:`, failList.map(f => ({ fileID: f.fileID, status: f.status, errMsg: f.errMsg })));
        // 对失败的尝试云函数
        const failPaths = failList.map(item => item.fileID);
        const cloudResult = await this._tryCloudFunction(failPaths);
        Object.assign(result, cloudResult.results);
        // 如果云函数也失败了，记录下来
        cloudResult.failed.forEach(p => {
          console.warn(`[ImageLoader] 云函数也失败: ${p}, errMsg=${failList.find(f => f.fileID === p)?.errMsg}`);
        });
      }

      this._saveCache();
      return result;
    }

    // ===== 客户端API完全失败，尝试云函数 =====
    console.log('[ImageLoader] 客户端API无响应，尝试云函数...');
    const cloudResult = await this._tryCloudFunction(paths);
    Object.assign(result, cloudResult.results);
    cloudResult.failed.forEach(p => {
      console.warn(`[ImageLoader] 云函数也失败: ${p}`);
    });
    this._saveCache();

    return result;
  }

  /**
   * 尝试通过云函数获取临时链接
   */
  async _tryCloudFunction(paths) {
    const results = {};
    const failed = [];

    try {
      const callRes = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('超时')), 15000);
        wx.cloud.callFunction({
          name: 'getTempFileURL',
          data: { fileList: paths }
        }).then(res => {
          clearTimeout(timer);
          resolve(res);
        }).catch(err => {
          clearTimeout(timer);
          reject(err);
        });
      });

      if (callRes.result && callRes.result.code === 0) {
        const fileList = callRes.result.fileList || [];
        fileList.forEach(item => {
          if (item.tempFileURL && item.fileID) {
            results[item.fileID] = item.tempFileURL;
            this._cache[item.fileID] = { url: item.tempFileURL, expire: Date.now() + CACHE_EXPIRE };
          } else if (item.fileID) {
            failed.push(item.fileID);
          }
        });
        const okCount = Object.keys(results).length;
        console.log(`[ImageLoader] 云函数: ${okCount}成功, ${failed.length}失败`);
      } else {
        console.warn('[ImageLoader] 云函数返回错误:', JSON.stringify(callRes.result)?.substring(0, 200));
        paths.forEach(p => failed.push(p));
      }
    } catch (err) {
      console.error('[ImageLoader] 云函数异常:', err.errMsg || err.message);
      paths.forEach(p => failed.push(p));
    }

    return { results, failed };
  }

  async resolve(path) {
    if (!path) return '';
    if (!path.startsWith('cloud://')) return path;
    const urls = await this.getTempURLs([path]);
    return urls[path] || '';
  }

  preload(paths) {
    if (!paths || paths.length === 0) return;
    this.getTempURLs(paths).catch(() => {});
  }

  clearExpired() {
    const now = Date.now();
    let changed = false;
    Object.keys(this._cache).forEach(key => {
      if (this._cache[key].expire <= now) { delete this._cache[key]; changed = true; }
    });
    if (changed) this._saveCache();
  }
}

const imageLoader = new ImageLoader();
module.exports = imageLoader;
