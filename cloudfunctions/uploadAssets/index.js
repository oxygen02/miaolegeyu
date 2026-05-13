/**
 * 云函数：上传默认资源图片到云存储
 * 
 * 使用方式：
 * 1. 在微信开发者工具中右键此云函数 → 上传并部署
 * 2. 确保本地 miniprogram/assets/ 目录下有需要的图片文件
 * 3. 调用此云函数即可批量上传
 * 
 * 注意：此函数仅用于初始化上传，不建议在生产环境频繁调用
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const fs = require('fs');
const path = require('path');

exports.main = async (event, context) => {
  const { action } = event;
  
  try {
    if (action === 'check') {
      // 检查云存储中是否存在关键文件
      const result = await cloud.getTempFileURL({
        fileList: [
          'cloud://cloud1-d4gfy27bn0f3f5346/icons/juze_avatar.png',
          'cloud://cloud1-d4gfy27bn0f3f5346/decorations/cat-avatar-icon.png',
          'cloud://cloud1-d4gfy27bn0f3f5346/banners/faqijucan.png'
        ]
      });
      
      const status = result.fileList.map(item => ({
        fileID: item.fileID,
        exists: !!item.tempFileURL,
        status: item.status,
        errMsg: item.errMsg
      }));
      
      return { code: 0, msg: '检查完成', data: status };
    }
    
    if (action === 'uploadFromBase64') {
      // 从 base64 数据上传图片到云存储
      const { filePath, base64Data } = event;
      if (!filePath || !base64Data) {
        return { code: -1, msg: '缺少参数 filePath 或 base64Data' };
      }
      
      // 将 base64 转为 Buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      const uploadResult = await cloud.uploadFile({
        cloudPath: filePath,
        fileContent: buffer
      });
      
      // 获取临时链接验证
      const urlResult = await cloud.getTempFileURL({
        fileList: [uploadResult.fileID]
      });
      
      return {
        code: 0,
        msg: '上传成功',
        fileID: uploadResult.fileID,
        tempFileURL: urlResult.fileList[0]?.tempFileURL
      };
    }
    
    return { code: -1, msg: '未知操作: ' + action };
    
  } catch (err) {
    console.error('uploadAssets 错误:', err);
    return { code: -1, msg: err.message };
  }
};
