const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 基础敏感词库（作为二次校验）
// 注意：只保留明确违规词汇，避免误伤正常内容
const SENSITIVE_WORDS = [
  // 政治敏感词（严格）
  '反动', '暴乱', '独裁', '专政', '颠覆', '政变',
  // 色情词汇（严格）
  '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交',
  // 暴力词汇（严格）
  '杀人', '放火', '爆炸', '恐怖', '枪支', '弹药', '炸弹',
  // 诈骗词汇（严格）
  '传销', '洗钱', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关（严格）
  '吸毒', '贩毒', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关（严格）
  '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死'
];

/**
 * 调用微信官方内容安全API (2.0版本)
 * @param {string} content - 待检查文本
 * @param {string} openid - 用户openid
 * @param {number} scene - 场景值 1:资料 2:评论 3:论坛 4:社交日志
 * @returns {Promise<object>} - 检查结果
 */
async function checkWithWxApi(content, openid, scene = 2) {
  try {
    // 使用2.0版本接口
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: openid,
      scene: scene,
      title: content.substring(0, 30) // 标题取前30字
    });
    
    // result.result.suggest: risky/pass
    // result.result.label: 100:正常 10001:广告 20001:时政 20002:色情 20003:辱骂 20006:违法犯罪 20008:欺诈 20012:低俗 20013:版权 21000:其他
    const suggest = result.result?.suggest || 'pass';
    const label = result.result?.label || 100;
    
    // 优化：只有明确返回 risky 才拦截，避免正常内容被误报
    const passed = suggest !== 'risky';
    
    return {
      passed: passed,
      suggest: suggest,
      label: label,
      detail: result.result?.detail || null,
      errCode: 0,
      errMsg: 'ok'
    };
  } catch (err) {
    console.error('微信内容安全API调用失败:', err);
    // API调用失败时放行，避免阻塞正常用户
    return {
      passed: true,
      suggest: 'error',
      label: -1,
      errCode: -1,
      errMsg: err.message || 'API调用失败'
    };
  }
}

/**
 * 本地敏感词检查（作为二次校验）
 * @param {string} text - 待检查文本
 * @returns {object} - { hasSensitive: boolean, words: array }
 */
function checkSensitiveWords(text) {
  const foundWords = [];
  
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) {
      foundWords.push(word);
    }
  }
  
  return {
    hasSensitive: foundWords.length > 0,
    words: foundWords
  };
}

exports.main = async (event, context) => {
  const { content, type = 'check', scene = 2 } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  
  // 校验登录态
  if (!openid) {
    return { code: -1, msg: '未登录' };
  }
  
  if (!content || typeof content !== 'string') {
    return { code: -1, msg: '内容不能为空' };
  }
  
  // 长度限制
  if (content.length > 2500) {
    return { code: -1, msg: '内容长度不能超过2500字符' };
  }
  
  try {
    // 优先调用微信官方API (2.0版本)
    const wxResult = await checkWithWxApi(content, openid, scene);
    
    // 如果微信API检测到违规，直接返回
    if (!wxResult.passed) {
      return {
        code: 403,
        data: {
          passed: false,
          source: 'wx_api',
          suggest: wxResult.suggest,
          label: wxResult.label,
          detail: wxResult.detail
        },
        msg: '内容包含违规信息，请修改后重试'
      };
    }
    
    // 微信API通过后，进行二次敏感词校验
    const localResult = checkSensitiveWords(content);
    if (localResult.hasSensitive) {
      return {
        code: 403,
        data: {
          passed: false,
          source: 'local',
          words: localResult.words
        },
        msg: '内容包含违规信息，请修改后重试'
      };
    }
    
    // 全部通过
    return {
      code: 0,
      data: {
        passed: true,
        wxCheck: wxResult
      },
      msg: '内容审核通过'
    };
    
  } catch (err) {
    console.error('内容检查失败:', err);
    return { code: -1, msg: '检查失败，请稍后重试' };
  }
};
