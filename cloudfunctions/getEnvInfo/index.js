const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event) => {
  try {
    // 尝试获取环境信息
    const wxContext = cloud.getWXContext();
    
    return {
      code: 0,
      data: {
        env: wxContext.ENV,
        openid: wxContext.OPENID,
        appid: wxContext.APPID
      }
    };
  } catch (err) {
    return {
      code: -1,
      msg: err.message
    };
  }
};
