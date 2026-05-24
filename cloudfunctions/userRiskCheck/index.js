const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 获取用户安全等级云函数
 * 用于识别风险用户（羊毛党、欺诈用户等）
 */

/**
 * 获取用户安全等级
 * @param {string} openid - 用户openid
 * @param {string} clientIp - 用户IP地址
 * @param {number} scene - 场景值 0:注册 1:营销作弊
 * @param {object} extraInfo - 额外信息
 * @returns {Promise<object>}
 */
async function getUserRiskRank(openid, clientIp, scene = 0, extraInfo = {}) {
  try {
    const { 
      mobileNo = '',      // 用户手机号
      emailAddress = '',  // 用户邮箱
      extendedInfo = ''   // 额外补充信息
    } = extraInfo;
    
    const result = await cloud.openapi.riskControl.getUserRiskRank({
      appid: cloud.getWXContext().APPID,
      openid: openid,
      scene: scene,
      client_ip: clientIp,
      mobile_no: mobileNo,
      email_address: emailAddress,
      extended_info: extendedInfo,
      is_test: false
    });
    
    // risk_rank: 0-4，数字越大风险越高
    return {
      success: true,
      riskRank: result.risk_rank,
      unionId: result.unoin_id,
      errCode: result.errcode,
      errMsg: result.errmsg
    };
  } catch (err) {
    console.error('获取用户安全等级失败:', err);
    return {
      success: false,
      riskRank: 0, // 默认低风险
      errCode: -1,
      errMsg: err.message || '获取失败'
    };
  }
}

exports.main = async (event, context) => {
  const { 
    scene = 0,           // 0:注册场景 1:营销作弊场景
    clientIp = '',       // 用户IP（前端传入或通过context获取）
    extraInfo = {}       // 额外信息：mobileNo, emailAddress等
  } = event;
  
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  if (!openid) {
    return { code: -1, msg: '未登录' };
  }
  
  // 如果没有传入clientIp，尝试从context获取
  const ip = clientIp || context.CLIENTIP || context.SOURCE_IP || '';
  
  try {
    const result = await getUserRiskRank(openid, ip, scene, extraInfo);
    
    if (!result.success) {
      return {
        code: -1,
        msg: result.errMsg || '获取用户安全等级失败'
      };
    }
    
    // 根据风险等级返回不同提示
    let riskLevel = 'low';
    let riskDesc = '低风险用户';
    
    if (result.riskRank >= 3) {
      riskLevel = 'high';
      riskDesc = '高风险用户';
    } else if (result.riskRank >= 1) {
      riskLevel = 'medium';
      riskDesc = '中风险用户';
    }
    
    return {
      code: 0,
      data: {
        riskRank: result.riskRank,
        riskLevel: riskLevel,
        riskDesc: riskDesc,
        unionId: result.unionId
      },
      msg: '获取用户安全等级成功'
    };
    
  } catch (err) {
    console.error('用户安全等级检查失败:', err);
    return { 
      code: -1, 
      msg: '检查失败，请稍后重试',
      data: { riskRank: 0, riskLevel: 'low' } // 失败时默认低风险
    };
  }
};
