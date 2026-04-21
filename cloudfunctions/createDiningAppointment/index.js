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
    paymentMode = 'AA'
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
        participants: [{
          openId: OPENID,
          name: '神秘喵友',
          avatar: '',
          joinTime: new Date()
        }],
        status: 'active',
        isCompleted: false,
        rating: null,
        createTime: new Date()
      }
    });
    
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
