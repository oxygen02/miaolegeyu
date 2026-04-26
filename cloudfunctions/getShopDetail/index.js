const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

    // 获取所有去过该店铺的用户评分（从已完成的约饭活动中）
    let additionalRecommenders = [];
    let totalRating = shop.rating || 0;
    let ratingCount = 1; // 默认至少有发起人的评分
    
    try {
      // 查询已完成的约饭活动
      const appointmentsResult = await db.collection('dining_appointments')
        .where({
          shopId: id,
          status: 'completed'
        })
        .get();
      
      const appointments = appointmentsResult.data || [];
      
      // 收集所有评分和推荐人
      for (const appointment of appointments) {
        // 如果有评价，累加评分
        if (appointment.rating && appointment.rating.stars) {
          totalRating += appointment.rating.stars;
          ratingCount++;
        }
        
        // 收集发起人信息作为追加推荐人
        if (appointment.initiatorOpenId && appointment.initiatorOpenId !== shop.recommenderOpenId) {
          const existingIndex = additionalRecommenders.findIndex(
            r => r.openId === appointment.initiatorOpenId
          );
          
          if (existingIndex === -1) {
            additionalRecommenders.push({
              openId: appointment.initiatorOpenId,
              name: appointment.initiatorName || '神秘喵友',
              avatar: appointment.initiatorAvatar || '',
              isAnonymous: appointment.isAnonymous || false,
              rating: appointment.rating ? appointment.rating.stars : 0,
              ratingComment: appointment.rating ? appointment.rating.comment : '',
              appointmentTime: appointment.appointmentTime
            });
          }
        }
        
        // 收集参与者中评价过的用户
        if (appointment.participants && appointment.participants.length > 0) {
          for (const participant of appointment.participants) {
            // 只收集有评价的用户
            if (participant.rating && participant.rating.stars && 
                participant.openId !== shop.recommenderOpenId &&
                !additionalRecommenders.find(r => r.openId === participant.openId)) {
              additionalRecommenders.push({
                openId: participant.openId,
                name: participant.name || '神秘喵友',
                avatar: participant.avatar || '',
                isAnonymous: participant.isAnonymous || false,
                rating: participant.rating.stars,
                ratingComment: participant.rating.comment || '',
                appointmentTime: appointment.appointmentTime
              });
            }
          }
        }
      }
      
      // 按时间倒序排列追加推荐人
      additionalRecommenders.sort((a, b) => 
        new Date(b.appointmentTime) - new Date(a.appointmentTime)
      );
      
    } catch (err) {
      console.error('获取追加推荐人失败:', err);
    }

    // 计算综合评分
    const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0;

    return {
      success: true,
      isOwner,
      shop: {
        ...shop,
        images,
        createTime: timeText,
        rating: parseFloat(averageRating),
        ratingCount: ratingCount,
        additionalRecommenders: additionalRecommenders
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
