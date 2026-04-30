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
    console.log('查询用户, openid:', openid);
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();
    console.log('查询结果:', users);
    
    if (!users || users.length === 0) {
      console.log('用户不存在');
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
    console.log('更新用户:', userId, '数据:', updateData);
    const updateResult = await db.collection('users').doc(userId).update({
      data: updateData
    });
    console.log('更新结果:', updateResult);
    
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
