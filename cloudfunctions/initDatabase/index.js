const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    // 尝试向 users 集合添加一个空文档来创建集合
    const result = await db.collection('users').add({
      data: {
        _openid: '',
        userId: 'init',
        nickName: '初始化用户',
        avatarUrl: '',
        isCustomLogin: false,
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
    });

    // 删除初始化文档
    await db.collection('users').doc(result._id).remove();

    return {
      code: 0,
      msg: 'users 集合创建成功'
    };
  } catch (err) {
    console.error('创建集合失败:', err);
    return {
      code: -1,
      msg: err.message || '创建集合失败'
    };
  }
};
