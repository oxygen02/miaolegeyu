const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, cuisine = 'all' } = event;

  try {
    let query = db.collection('shops').where({
      status: 'active'
    });

    // 如果指定了菜系，添加筛选条件
    // 支持同义词映射：shaokao -> ['shaokao', 'bbq', 'snack'] (烧烤包含小吃)
    const cuisineSynonyms = {
      'shaokao': ['shaokao', 'bbq', 'snack', 'meat'],
      'bbq': ['shaokao', 'bbq', 'snack', 'meat'],
      'huoguo': ['huoguo', 'hotpot'],
      'hotpot': ['huoguo', 'hotpot'],
      'haixian': ['haixian', 'seafood'],
      'seafood': ['haixian', 'seafood'],
      'longxia': ['longxia', 'crayfish'],
      'crayfish': ['longxia', 'crayfish'],
      'hanliao': ['hanliao', 'japanese', 'riliao'],
      'japanese': ['hanliao', 'japanese', 'riliao'],
      'riliao': ['hanliao', 'japanese', 'riliao'],
      'xishi': ['xishi', 'western'],
      'western': ['xishi', 'western'],
      'chuanchuan': ['chuanchuan', 'bbq', 'shaokao'],
      'meat': ['meat', 'bbq', 'shaokao']
    };

    if (cuisine && cuisine !== 'all') {
      const synonyms = cuisineSynonyms[cuisine] || [cuisine];
      // 同时匹配 cuisine 字段（单标签，兼容旧数据）和 cuisines 字段（多标签数组）
      query = query.where(_.or([
        { cuisine: _.in(synonyms) },
        { cuisines: _.elemMatch(_.in(synonyms)) }
      ]));
    }

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const shopsResult = await query
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    // 格式化数据
    const shops = shopsResult.data.map(shop => {
      // 格式化时间
      const createDate = shop.createTime ? new Date(shop.createTime) : new Date();
      const now = new Date();
      const diff = now - createDate;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      let timeText;
      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60));
          timeText = minutes + '分钟前';
        } else {
          timeText = hours + '小时前';
        }
      } else if (days < 30) {
        timeText = days + '天前';
      } else {
        timeText = createDate.toLocaleDateString('zh-CN', {
          month: 'short',
          day: 'numeric'
        });
      }

      // 处理图片 - 只保留第一张图，并获取临时链接
      let images = shop.images || [];
      if (images.length > 0) {
        // 只取第一张图
        images = [images[0]];
      }

      return {
        ...shop,
        images,
        createTime: timeText
      };
    });

    // 批量获取图片临时访问链接
    const allImages = shops.flatMap(shop => shop.images).filter(url => url && url.includes('cloud1-d5ggnf5wh2d872f3c'));
    if (allImages.length > 0) {
      try {
        const tempUrls = await cloud.getTempFileURL({
          fileList: allImages
        });
        
        if (tempUrls.fileList && tempUrls.fileList.length > 0) {
          // 创建URL映射
          const urlMap = {};
          tempUrls.fileList.forEach(file => {
            urlMap[file.fileID] = file.tempFileURL;
          });
          
          // 更新店铺图片URL
          shops.forEach(shop => {
            if (shop.images && shop.images.length > 0) {
              const originalUrl = shop.images[0];
              shop.images = [urlMap[originalUrl] || originalUrl];
            }
          });
        }
      } catch (imgErr) {
        console.error('获取图片临时链接失败:', imgErr);
      }
    }

    return {
      success: true,
      shops,
      total,
      hasMore: skip + shops.length < total
    };
  } catch (err) {
    console.error('获取店铺列表失败:', err);
    return {
      success: false,
      error: err.message || '获取失败',
      shops: []
    };
  }
};
