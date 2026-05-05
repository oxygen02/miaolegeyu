/**
 * 图片上传校验工具
 * 包含：大小限制、格式校验、尺寸检查
 */

const ALLOWED_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const MAX_SIZE_MB = 5; // 最大5MB
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024;

/**
 * 校验图片文件
 * @param {object} file - 图片文件对象（tempFilePath, size）
 * @returns {object} { valid, message }
 */
function validateImage(file) {
  if (!file || !file.tempFilePath) {
    return { valid: false, message: '无效的图片文件' };
  }
  
  // 检查文件大小
  if (file.size && file.size > MAX_SIZE) {
    return { 
      valid: false, 
      message: `图片大小不能超过${MAX_SIZE_MB}MB，当前大小：${(file.size / 1024 / 1024).toFixed(2)}MB` 
    };
  }
  
  // 检查文件格式
  const ext = getFileExtension(file.tempFilePath);
  if (!ext || !ALLOWED_TYPES.includes(ext.toLowerCase())) {
    return { 
      valid: false, 
      message: `不支持的图片格式，仅支持：${ALLOWED_TYPES.join(', ')}` 
    };
  }
  
  return { valid: true, message: '校验通过' };
}

/**
 * 批量校验图片
 * @param {array} files - 图片文件数组
 * @param {number} maxCount - 最大数量限制
 * @returns {object} { valid, message, validFiles }
 */
function validateImages(files, maxCount = 9) {
  if (!files || files.length === 0) {
    return { valid: false, message: '请选择图片', validFiles: [] };
  }
  
  if (files.length > maxCount) {
    return { 
      valid: false, 
      message: `最多选择${maxCount}张图片`, 
      validFiles: files.slice(0, maxCount) 
    };
  }
  
  const validFiles = [];
  for (const file of files) {
    const result = validateImage(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      return { valid: false, message: result.message, validFiles: [] };
    }
  }
  
  return { valid: true, message: '校验通过', validFiles };
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filePath) {
  if (!filePath) return '';
  const parts = filePath.split('.');
  return parts[parts.length - 1] || '';
}

/**
 * 压缩图片（如果需要）
 * @param {string} tempFilePath - 临时文件路径
 * @param {number} quality - 压缩质量 0-100
 * @returns {Promise<string>} 压缩后的临时文件路径
 */
function compressImage(tempFilePath, quality = 80) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: tempFilePath,
      quality,
      success: (res) => {
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.warn('图片压缩失败，使用原图:', err);
        resolve(tempFilePath); // 压缩失败使用原图
      }
    });
  });
}

module.exports = {
  validateImage,
  validateImages,
  compressImage,
  MAX_SIZE_MB,
  ALLOWED_TYPES
};
