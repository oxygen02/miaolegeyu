const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 基础敏感词库（可根据需要扩展）
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩',
  // 其他违规
  '毒品', '吸毒', '贩毒', '违禁', '非法'
];

// 替换字符映射
const CHAR_MAP = {
  '@': 'a', '＠': 'a', 'ⓐ': 'a',
  '0': 'o', '０': 'o', 'ⓞ': 'o',
  '1': 'i', 'l': 'i', 'ｉ': 'i', 'ⓘ': 'i',
  '3': 'e', '３': 'e', 'ⓔ': 'e',
  '5': 's', '５': 's', 'ⓢ': 's',
  '7': 't', '７': 't', 'ⓣ': 't',
  '9': 'g', '９': 'g', 'ⓖ': 'g'
};

/**
 * 文本预处理：统一转换为小写，替换特殊字符
 * @param {string} text - 原始文本
 * @returns {string} - 处理后的文本
 */
function preprocessText(text) {
  if (!text) return '';
  
  let processed = text.toLowerCase();
  
  // 替换特殊字符
  for (const [key, value] of Object.entries(CHAR_MAP)) {
    processed = processed.replace(new RegExp(key, 'g'), value);
  }
  
  // 去除空格和特殊符号
  processed = processed.replace(/[\s\p{P}\p{S}]/gu, '');
  
  return processed;
}

/**
 * 检查文本是否包含敏感词
 * @param {string} text - 待检查文本
 * @returns {object} - { hasSensitive: boolean, words: array }
 */
function checkSensitiveWords(text) {
  const processed = preprocessText(text);
  const foundWords = [];
  
  for (const word of SENSITIVE_WORDS) {
    if (processed.includes(word)) {
      foundWords.push(word);
    }
  }
  
  return {
    hasSensitive: foundWords.length > 0,
    words: foundWords
  };
}

/**
 * 替换敏感词为*
 * @param {string} text - 原始文本
 * @returns {string} - 处理后的文本
 */
function maskSensitiveWords(text) {
  let masked = text;
  
  for (const word of SENSITIVE_WORDS) {
    const regex = new RegExp(word, 'gi');
    masked = masked.replace(regex, '*'.repeat(word.length));
  }
  
  return masked;
}

exports.main = async (event) => {
  const { content, type = 'check' } = event;
  const wxContext = cloud.getWXContext();
  
  // 校验登录态
  if (!wxContext.OPENID) {
    return { code: -1, msg: '未登录' };
  }
  
  if (!content || typeof content !== 'string') {
    return { code: -1, msg: '内容不能为空' };
  }
  
  // 长度限制
  if (content.length > 1000) {
    return { code: -1, msg: '内容长度不能超过1000字符' };
  }
  
  try {
    switch (type) {
      case 'check':
        // 检查敏感词
        const result = checkSensitiveWords(content);
        return {
          code: 0,
          data: result,
          msg: result.hasSensitive ? '内容包含敏感词' : '内容正常'
        };
        
      case 'mask':
        // 替换敏感词
        const masked = maskSensitiveWords(content);
        return {
          code: 0,
          data: { masked },
          msg: '处理成功'
        };
        
      case 'strict':
        // 严格模式：包含敏感词则拒绝
        const strictResult = checkSensitiveWords(content);
        if (strictResult.hasSensitive) {
          return {
            code: 403,
            data: strictResult,
            msg: '内容包含违规信息，请修改后重试'
          };
        }
        return {
          code: 0,
          data: { passed: true },
          msg: '内容审核通过'
        };
        
      default:
        return { code: -1, msg: '未知的检查类型' };
    }
  } catch (err) {
    console.error('内容检查失败:', err);
    return { code: -1, msg: '检查失败' };
  }
};
