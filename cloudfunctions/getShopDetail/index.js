const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { id } = event;
  const { OPENID } = cloud.getWXContext();

  if (!id) {
    return {
      success: false,
      error: '店铺ID不能为空'
    };
  }

  try {
    const shopResult = await db.collection('shops').doc(id).get();

    if (!shopResult.data) {
      return {
        success: false,
        error: '店铺不存在'
      };
    }

    const shop = shopResult.data;

    // 检查状态
    if (shop.status !== 'active') {
      return {
        success: false,
        error: '店铺已下架'
      };
    }

    // 检查是否是发起者
    const isOwner = shop.recommenderOpenId === OPENID;

    // 格式化时间
    const createDate = shop.createTime ? new Date(shop.createTime) : new Date();
    const timeText = createDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // 获取图片临时访问链接
    let images = shop.images || [];
    if (images.length > 0) {
      try {
        // 过滤掉非云存储链接的图片
        const cloudImages = images.filter(url => url.includes('cloud1-d5ggnf5wh2d872f3c'));
        if (cloudImages.length > 0) {
          const tempUrls = await cloud.getTempFileURL({
            fileList: cloudImages
          });
          if (tempUrls.fileList && tempUrls.fileList.length > 0) {
            images = tempUrls.fileList.map(file => file.tempFileURL || file.fileID);
          }
        }
      } catch (imgErr) {
        console.error('获取图片临时链接失败:', imgErr);
        // 如果获取失败，保留原链接
      }
    }

    return {
      success: true,
      isOwner,
      shop: {
        ...shop,
        images,
        createTime: timeText
      }
    };
  } catch (err) {
    console.error('获取店铺详情失败:', err);
    return {
      success: false,
      error: err.message || '获取失败'
    };
  }
};
