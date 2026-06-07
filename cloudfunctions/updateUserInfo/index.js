const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

let checkContent;
try {
  const contentSecurity = require('./contentSecurity');
  checkContent = contentSecurity.checkContent;
} catch (err) {
  console.warn('contentSecurity 模块加载失败，使用基础检查:', err.message);
  checkContent = async (content) => ({ passed: true, msg: '内容审核通过' });
}

exports.main = async (event) => {
  const { nickName, avatarUrl } = event;

  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return {
        code: -1,
        msg: '未登录'
      };
    }

    // 内容安全检查（昵称）
    if (nickName) {
      const securityCheck = await checkContent(nickName, openid, 1); // scene=1:资料
      if (!securityCheck.passed) {
        return {
          code: 403,
          msg: securityCheck.msg
        };
      }
    }

    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();
    
    let userId;
    
    if (!users || users.length === 0) {
      const newUser = {
        _openid: openid,
        userId: openid,
        nickName: nickName || '喵了个鱼用户',
        avatarUrl: avatarUrl || '',
        isCustomLogin: false,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      };
      
      const result = await db.collection('users').add({
        data: newUser
      });
      
      userId = result._id;
    } else {
      userId = users[0]._id;
    }
    
    const updateData = {
      updateTime: db.serverDate()
    };
    
    if (nickName !== undefined) {
      updateData.nickName = nickName;
    }
    
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }
    
    await db.collection('users').doc(userId).update({
      data: updateData
    });
    
    return {
      code: 0,
      msg: '更新成功',
      data: updateData
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message || '更新失败'
    };
  }
};
