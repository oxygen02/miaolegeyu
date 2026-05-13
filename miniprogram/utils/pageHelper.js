/**
 * 页面辅助工具
 * 提供统一的图片路径等待逻辑
 */
const app = getApp();

/**
 * 等待图片路径就绪并设置到页面 data 中
 * 在页面 onLoad 中使用: await waitForImages(this);
 * @param {Page} pageInstance - 页面实例（this）
 */
function waitForImages(pageInstance) {
  return app.whenImageReady().then(resolved => {
    pageInstance.setData({ imagePaths: resolved });
  });
}

module.exports = { waitForImages };
