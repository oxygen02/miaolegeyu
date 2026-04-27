const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  try {
    const { data: avatars } = await db.collection('avatars')
      .limit(5)
      .get();
    
    return {
      code: 0,
      data: avatars.map(item => ({
        _id: item._id,
        name: item.name,
        imageUrl: item.imageUrl,
        cloudPath: item.cloudPath
      }))
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message
    };
  }
};
