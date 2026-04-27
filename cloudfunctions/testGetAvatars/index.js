const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    // 只获取1个头像进行测试
    const { data: avatars } = await db.collection('avatars')
      .limit(1)
      .get();

    if (avatars.length === 0) {
      return { code: 0, msg: '没有头像数据' };
    }

    const avatar = avatars[0];
    console.log('头像数据:', JSON.stringify(avatar));

    // 尝试获取临时链接
    if (avatar.cloudPath) {
      try {
        const result = await cloud.getTempFileURL({
          fileList: [avatar.cloudPath]
        });
        console.log('临时链接结果:', JSON.stringify(result));
        return {
          code: 0,
          data: {
            avatar: avatar,
            tempUrl: result.fileList[0]?.tempFileURL
          }
        };
      } catch (err) {
        console.error('获取临时链接失败:', err);
        return {
          code: -1,
          msg: '获取临时链接失败: ' + err.message,
          data: { avatar }
        };
      }
    }

    return { code: 0, data: { avatar } };
  } catch (err) {
    console.error('testGetAvatars error:', err);
    return {
      code: -1,
      msg: err.message
    };
  }
};
