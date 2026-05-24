const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 内容安全检查云函数
 * 调用微信官方 msgSecCheck 2.0 接口
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/sec-center/sec-check/msgSecCheck.html
 */

exports.main = async (event, context) => {
  const { content, scene = 2, title = '', nickname = '' } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 校验登录态
  if (!openid) {
    return { code: -1, msg: '未登录' };
  }

  if (!content || typeof content !== 'string') {
    return { code: -1, msg: '内容不能为空' };
  }

  // 长度限制（msgSecCheck 上限 2500 字）
  if (content.length > 2500) {
    return { code: -1, msg: '内容长度不能超过2500字符' };
  }

  try {
    // 调用微信官方内容安全API (2.0版本)
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: openid,
      scene: scene,
      title: title || content.substring(0, 30)
    });

    console.log('msgSecCheck 返回结果:', JSON.stringify(result));

    // 根据微信官方文档判断结果
    // errcode: 0 = 正常, 87014 = 内容含有违法违规内容
    // result.suggest: pass = 通过, risky = 违规
    const errcode = result.errcode;
    const suggest = result.result?.suggest;

    if (errcode === 87014 || suggest === 'risky') {
      return {
        code: 403,
        data: {
          passed: false,
          errcode: errcode,
          suggest: suggest,
          detail: result.result?.detail || null
        },
        msg: '内容包含违规信息，请修改后重试'
      };
    }

    // 其他错误码（非 0 且非 87014）视为 API 调用异常，放行避免阻塞正常用户
    if (errcode !== 0) {
      console.warn('msgSecCheck 返回异常错误码:', errcode, result.errmsg);
      return {
        code: 0,
        data: {
          passed: true,
          warning: '检测服务异常，已放行',
          errcode: errcode
        },
        msg: '内容审核通过'
      };
    }

    // 正常通过
    return {
      code: 0,
      data: {
        passed: true,
        suggest: suggest,
        detail: result.result?.detail || null
      },
      msg: '内容审核通过'
    };

  } catch (err) {
    console.error('msgSecCheck 调用异常:', err);
    // API 调用异常时放行，避免阻塞正常用户
    return {
      code: 0,
      data: {
        passed: true,
        warning: '检测服务暂不可用，已放行'
      },
      msg: '内容审核通过'
    };
  }
};
