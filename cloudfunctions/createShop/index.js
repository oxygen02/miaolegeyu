const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  console.log('云函数被调用，接收数据:', event);
  
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const {
    name,
    cuisine,
    cuisineName,
    avgPrice,
    location,
    recommendedDishes,
    reason,
    notice,
    rating,
    images,
    isAnonymous,
    uploaderName,
    uploaderAvatar
  } = event;

  // 验证必填字段
  if (!name || !cuisine || !avgPrice || !location || !images || images.length === 0) {
    console.log('验证失败: 缺少必填字段');
    return {
      success: false,
      error: '请填写所有必填字段'
    };
  }

  try {
    const shopData = {
      name: name.trim(),
      cuisine,
      cuisineName: cuisineName || '',
      avgPrice: parseInt(avgPrice) || 0,
      location: location.trim(),
      recommendedDishes: recommendedDishes || [],
      reason: reason || '',
      notice: notice || '',
      rating: parseInt(rating) || 3,
      images: images || [],
      isAnonymous: isAnonymous || false,
      uploaderName: isAnonymous ? '' : (uploaderName || ''),
      uploaderAvatar: isAnonymous ? '' : (uploaderAvatar || ''),
      openid: isAnonymous ? '' : openid,
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      status: 'active'
    };

    console.log('准备写入数据库:', shopData);
    
    const result = await db.collection('shops').add({
      data: shopData
    });

    console.log('数据库写入成功:', result);

    return {
      success: true,
      shopId: result._id,
      msg: '店铺推荐发布成功'
    };
  } catch (err) {
    console.error('创建店铺失败:', err);
    return {
      success: false,
      error: err.message || err.toString() || '发布失败'
    };
  }
};
