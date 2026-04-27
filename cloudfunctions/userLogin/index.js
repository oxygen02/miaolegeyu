const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { 
    nickName, 
    avatarUrl,
    isCustom = false // 是否为自定义登录（非微信登录）
  } = event;
  
  try {
    // 获取微信上下文
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid && !isCustom) {
      return {
        code: -1,
        msg: '获取用户身份失败'
      };
    }
    
    // 生成用户ID
    // 微信登录：使用openid
    // 自定义登录：生成独立ID
    const userId = openid || generateUserId();
    
    // 查询用户是否已存在
    const { data: existingUsers } = await db.collection('users')
      .where({
        _openid: openid || db.command.eq(null)
      })
      .limit(1)
      .get();
    
    let userInfo;
    
    if (existingUsers && existingUsers.length > 0) {
      // 用户已存在，更新信息
      userInfo = existingUsers[0];
      
      // 如果是微信登录且提供了新信息，则更新
      if (!isCustom && (nickName || avatarUrl)) {
        const updateData = {};
        if (nickName) updateData.nickName = nickName;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        updateData.lastLoginTime = db.serverDate();
        
        await db.collection('users').doc(userInfo._id).update({
          data: updateData
        });
        
        userInfo = { ...userInfo, ...updateData };
      }
    } else {
      // 新用户，创建记录
      const newUser = {
        _openid: openid || null,
        userId: userId,
        nickName: nickName || '喵了个鱼用户',
        avatarUrl: avatarUrl || '',
        isCustomLogin: isCustom,
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      };
      
      const result = await db.collection('users').add({
        data: newUser
      });
      
      userInfo = {
        _id: result._id,
        ...newUser
      };
    }
    
    return {
      code: 0,
      msg: '登录成功',
      data: {
        userId: userInfo.userId,
        nickName: userInfo.nickName,
        avatarUrl: userInfo.avatarUrl,
        isCustomLogin: userInfo.isCustomLogin
      }
    };
  } catch (err) {
    console.error('userLogin error:', err);
    return {
      code: -1,
      msg: err.message || '登录失败'
    };
  }
};

// 生成独立用户ID（自定义登录时使用）
function generateUserId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `user_${timestamp}${random}`;
}
