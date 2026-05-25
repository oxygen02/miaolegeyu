const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

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
 * 调用微信官方内容安全API (msgSecCheck 2.0)
 * 策略：只有明确返回 risky 才拦截，pass/review 均视为通过
 * 文档：https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/sec-check/security.msgSecCheck.html
 */
async function checkWithWxApi(content) {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: cloud.getWXContext().OPENID,
      scene: 2 // 2:评论（适用于发布内容）
    });

    const errcode = result.errcode;
    const suggest = result.result?.suggest;

    // 策略：只有明确返回 risky 或 errcode === 87014 才拦截
    if (errcode === 87014 || suggest === 'risky') {
      return {
        passed: false,
        suggest: suggest,
        msg: '所发布内容含违规信息'
      };
    }

    // pass 或 review 都视为通过
    return { passed: true, msg: '内容审核通过' };
  } catch (err) {
    console.error('微信内容安全API调用失败:', err);
    // API 调用失败时放行，避免阻塞正常用户
    return { passed: true, msg: '检测服务暂不可用，已放行' };
  }
}

exports.main = async (event) => {
  const { type, content, contact, userInfo, systemInfo } = event;
  const wxContext = cloud.getWXContext();

  try {
    // 参数校验
    if (!type || !content) {
      return { success: false, msg: '反馈类型和内容不能为空' };
    }

    if (content.length > 500) {
      return { success: false, msg: '反馈内容不能超过500字' };
    }

    // 内容安全检查
    const contentToCheck = [content, contact].filter(Boolean).join(' ');
    if (contentToCheck) {
      // 本地敏感词检查
      const localCheck = checkSensitiveWords(contentToCheck);
      if (localCheck.hasSensitive) {
        return { success: false, msg: '所发布内容含违规信息' };
      }

      // 微信官方API检查
      const wxCheck = await checkWithWxApi(contentToCheck);
      if (wxCheck.passed === false) {
        return { success: false, msg: wxCheck.msg || '所发布内容含违规信息' };
      }
    }

    const now = new Date();

    // 创建反馈记录
    const result = await db.collection('feedback').add({
      data: {
        openid: wxContext.OPENID,
        type,
        content,
        contact,
        userInfo,
        systemInfo,
        status: 'pending',
        adminReply: '',
        createdAt: now,
        updatedAt: now
      }
    });

    return {
      success: true,
      msg: '提交成功',
      data: { id: result._id }
    };
  } catch (err) {
    console.error('submitFeedback error:', err);
    return { success: false, msg: err.message || '提交失败' };
  }
};
