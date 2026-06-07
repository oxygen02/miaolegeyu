const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { page = 1, pageSize = 10, cuisine = 'all' } = event;
  
  // 获取用户信息（用于同城过滤）
  let userCity = '';
  try {
    const wxContext = cloud.getWXContext();
    if (wxContext.OPENID) {
      const { data: users } = await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .limit(1)
        .field({ userCity: true })
        .get();
      
      if (users && users.length > 0 && users[0].userCity) {
        userCity = users[0].userCity.city || '';
      }
    }
  } catch (err) {
    console.error('获取用户城市失败:', err);
  }

  try {
    // 基础查询条件
    let baseConditions = [
      { status: 'active' }
    ];
    
    // 如果用户设置了城市，优先展示同城店铺
    if (userCity) {
      baseConditions.push(
        _.or([
          { city: userCity },          // 同城店铺
          { city: '' },                // 未设置城市的店铺（兼容旧数据）
          { city: _.exists(false) }    // 没有城市字段的店铺
        ])
      );
    }

    let query = db.collection('shops').where(_.and(baseConditions));

    // 如果指定了菜系，添加筛选条件
    // 支持同义词映射：shaokao -> ['shaokao', 'bbq', 'snack'] (烧烤包含小吃)
    const cuisineSynonyms = {
      // 中餐大类（包含所有中式菜系）
      'zhongcan': ['chinese', 'zhongcan', 'chuanyu', 'beifang', 'yungui', 
                   'huazhong', 'xianggan', 'yueshi', 'jiangnan', 'xibei',
                   'sifang', 'nongjia', 'zizhu', 'snack', 'fastfood'],
      'chinese': ['chinese', 'zhongcan', 'chuanyu', 'beifang', 'yungui',
                 'huazhong', 'xianggan', 'yueshi', 'jiangnan', 'xibei',
                 'sifang', 'nongjia', 'zizhu', 'snack', 'fastfood'],
      // 地方菜系也属于中餐
      'chuanyu': ['chuanyu', 'chinese', 'zhongcan'],
      'beifang': ['beifang', 'chinese', 'zhongcan'],
      'yungui': ['yungui', 'chinese', 'zhongcan'],
      'huazhong': ['huazhong', 'chinese', 'zhongcan'],
      'xianggan': ['xianggan', 'chinese', 'zhongcan'],
      'yueshi': ['yueshi', 'chinese', 'zhongcan'],
      'jiangnan': ['jiangnan', 'chinese', 'zhongcan'],
      'xibei': ['xibei', 'chinese', 'zhongcan'],
      'sifang': ['sifang', 'chinese', 'zhongcan'],
      'nongjia': ['nongjia', 'chinese', 'zhongcan'],
      // 火锅类
      'huoguo': ['huoguo', 'hotpot'],
      'hotpot': ['huoguo', 'hotpot'],
      'chuanchuan': ['chuanchuan', 'bbq', 'shaokao'],
      // 烧烤类
      'shaokao': ['shaokao', 'bbq', 'snack', 'meat'],
      'bbq': ['shaokao', 'bbq', 'snack', 'meat'],
      'meat': ['meat', 'bbq', 'shaokao'],
      // 海鲜类
      'haixian': ['haixian', 'seafood'],
      'seafood': ['haixian', 'seafood'],
      // 日韩料理
      'hanliao': ['hanliao', 'korean'],
      'riliao': ['riliao', 'japanese'],
      'japanese': ['riliao', 'japanese'],
      'korean': ['hanliao', 'korean'],
      // 西式料理
      'xishi': ['xishi', 'western'],
      'western': ['xishi', 'western'],
      'dongnanya': ['dongnanya', 'thai', 'vietnamese', 'malaysian'],
      // 其他
      'longxia': ['longxia', 'crayfish'],
      'crayfish': ['longxia', 'crayfish'],
      'dessert': ['dessert'],
      'tea': ['tea'],
      'cafe': ['cafe'],
      'bar': ['bar'],
      'zizhu': ['zizhu', 'buffet']
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
    const allImages = shops.flatMap(shop => shop.images).filter(url => url && url.includes('cloud1-d4gfy27bn0f3f5346'));
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
