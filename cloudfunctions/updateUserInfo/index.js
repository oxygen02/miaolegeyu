const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { nickName, avatarUrl } = event;
  
  try {
    // 获取微信上下文
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (!openid) {
      return {
        code: -1,
        msg: '未登录'
      };
    }
    
    // 查询用户
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();
    
    if (!users || users.length === 0) {
      return {
        code: -1,
        msg: '用户不存在'
      };
    }
    
    const userId = users[0]._id;
    
    // 构建更新数据
    const updateData = {
      updateTime: db.serverDate()
    };
    
    if (nickName !== undefined) {
      updateData.nickName = nickName;
    }
    
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }
    
    // 更新用户信息
    await db.collection('users').doc(userId).update({
      data: updateData
    });
    
    return {
      code: 0,
      msg: '更新成功',
      data: updateData
    };
  } catch (err) {
    console.error('updateUserInfo error:', err);
    return {
      code: -1,
      msg: err.message || '更新失败'
    };
  }
};
