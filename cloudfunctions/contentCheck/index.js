const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 基础敏感词库
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  // 其他违规
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

/**
 * 本地敏感词检查
 */
function checkSensitiveWords(text) {
  if (!text) return { hasSensitive: false };
  const foundWords = [];
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) foundWords.push(word);
  }
  return { hasSensitive: foundWords.length > 0, words: foundWords };
}

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
    // 本地敏感词检查
    const localCheck = checkSensitiveWords(content);
    if (localCheck.hasSensitive) {
      console.log('本地敏感词检测到违规:', localCheck.words);
      return {
        code: 403,
        data: {
          passed: false,
          reason: 'local_sensitive_word',
          sensitiveWords: localCheck.words
        },
        msg: '所发布内容含违规信息'
      };
    }

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
        msg: '所发布内容含违规信息'
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
