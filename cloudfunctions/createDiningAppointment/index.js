const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { 
    shopId, 
    appointmentTime, 
    deadline, 
    note,
    maxParticipants,
    requirements = [],
    customRequirement,
    paymentMode = 'AA',
    isAnonymous = false,
    notifyInterested = false // 是否通知感兴趣的用户
  } = event;
  const { OPENID } = cloud.getWXContext();
  
  if (!shopId || !appointmentTime || !deadline) {
    return { success: false, error: '缺少必要参数' };
  }
  
  try {
    // 获取店铺信息
    let shopName = '未知店铺';
    try {
      const shop = await db.collection('shops').doc(shopId).get();
      shopName = shop.data.name || '未知店铺';
    } catch (shopErr) {
      console.log('获取店铺信息失败:', shopErr);
    }
    
    // 创建报名（不依赖 users 集合）
    const result = await db.collection('dining_appointments').add({
      data: {
        shopId,
        shopName: shopName,
        initiatorOpenId: OPENID,
        initiatorName: '神秘喵友',
        initiatorAvatar: '',
        appointmentTime: new Date(appointmentTime),
        deadline: new Date(deadline),
        note: note || '',
        maxParticipants: maxParticipants || 0,
        requirements: requirements || [],
        customRequirement: customRequirement || '',
        paymentMode: paymentMode || 'AA',
        isAnonymous: isAnonymous || false,
        participants: [{
          openId: OPENID,
          name: isAnonymous ? '匿名喵友' : '神秘喵友',
          avatar: '',
          joinTime: new Date()
        }],
        status: 'active',
        isCompleted: false,
        rating: null,
        createTime: new Date()
      }
    });

    // 如果需要，通知对该店铺感兴趣的用户
    if (notifyInterested) {
      try {
        const interests = await db.collection('shop_dining_interests')
          .where({ shopId: shopId })
          .get();

        if (interests.data.length > 0) {
          const openIds = interests.data.map(item => item.openId);
          console.log('需要通知的用户:', openIds);

          // 创建通知记录
          for (const openId of openIds) {
            if (openId !== OPENID) { // 不通知发起人自己
              await db.collection('notifications').add({
                data: {
                  type: 'dining_interest',
                  title: '约饭活动提醒',
                  content: `您关注的「${shopName}」有人发起约饭啦！`,
                  openId: openId,
                  shopId: shopId,
                  appointmentId: result._id,
                  isRead: false,
                  createTime: new Date()
                }
              });
            }
          }
        }
      } catch (notifyErr) {
        console.error('通知感兴趣用户失败:', notifyErr);
        // 不影响主流程
      }
    }

    return {
      success: true,
      appointmentId: result._id,
      message: '约饭报名发起成功'
    };
  } catch (err) {
    console.error('创建约饭报名失败:', err);
    return { success: false, error: err.message };
  }
};
