const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// ========== 内联内容安全检查（避免 require 跨目录问题）==========

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

// 本地敏感词检查
function checkSensitiveWords(text) {
  if (!text) return { hasSensitive: false };
  const foundWords = [];
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) foundWords.push(word);
  }
  return { hasSensitive: foundWords.length > 0, words: foundWords };
}

// 调用微信官方内容安全API (msgSecCheck)
async function checkTextWithWxApi(content, openid, scene = 2) {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: openid,
      scene: scene
    });

    const suggest = result.result?.suggest;

    // 只有明确返回 risky 才拦截
    if (suggest === 'risky') {
      return {
        passed: false,
        suggest: suggest,
        msg: '内容包含违规信息'
      };
    }

    return { passed: true, msg: '内容审核通过' };
  } catch (err) {
    console.error('msgSecCheck 调用失败:', err);
    // API 调用失败时放行
    return { passed: true, msg: '检测服务暂不可用，已放行' };
  }
}

// 综合内容安全检查（本地敏感词 + 微信API）
async function checkContent(content, openid, scene = 2) {
  if (!content || !content.trim()) {
    return { passed: true, msg: '内容为空' };
  }

  // 本地敏感词检查
  const localCheck = checkSensitiveWords(content);
  if (localCheck.hasSensitive) {
    return {
      passed: false,
      msg: '所发布内容含违规信息'
    };
  }

  // 微信官方API检查
  const wxCheck = await checkTextWithWxApi(content, openid, scene);
  if (wxCheck.passed === false && wxCheck.suggest === 'risky') {
    return {
      passed: false,
      msg: '所发布内容含违规信息'
    };
  }

  return { passed: true, msg: '内容审核通过' };
}

// ========== 主函数 ==========

exports.main = async (event, context) => {
  const {
    shopId,
    appointmentTime,
    deadline,
    note,
    maxParticipants,
    requirements = [],
    customRequirement,
    paymentMode = '',
    isAnonymous = false,
    notifyInterested = false,
    initiatorName,
    initiatorAvatar
  } = event;
  const { OPENID } = cloud.getWXContext();

  if (!shopId || !appointmentTime || !deadline) {
    return { success: false, error: '缺少必要参数' };
  }

  try {
    // 内容安全检查
    const contentToCheck = [note, customRequirement].filter(Boolean).join(' ');
    if (contentToCheck) {
      const securityCheck = await checkContent(contentToCheck, OPENID, 2);
      if (!securityCheck.passed) {
        return { success: false, error: securityCheck.msg };
      }
    }
    
    // 获取店铺信息
    let shopName = '未知店铺';
    try {
      const shop = await db.collection('shops').doc(shopId).get();
      shopName = shop.data.name || '未知店铺';
    } catch (shopErr) {
      console.log('获取店铺信息失败:', shopErr);
    }
    
    // 获取创建者信息（优先使用传入的参数）
    let creatorName = initiatorName || '';
    let creatorAvatar = initiatorAvatar || '';
    if (!creatorName) {
      try {
        const { data: users } = await db.collection('users').where({ _openid: OPENID }).limit(1).get();
        if (users && users.length > 0) {
          creatorName = users[0].nickName || '';
          creatorAvatar = users[0].avatarUrl || '';
        }
      } catch (err) {
        console.log('获取用户信息失败:', err);
      }
    }

    // 创建报名
    const result = await db.collection('dining_appointments').add({
      data: {
        shopId,
        shopName: shopName,
        initiatorOpenId: OPENID,
        initiatorName: creatorName || '神秘喵友',
        initiatorAvatar: creatorAvatar || '',
        appointmentTime: new Date(appointmentTime),
        deadline: new Date(deadline),
        tzFixed: true,
        note: note || '',
        maxParticipants: maxParticipants || 0,
        requirements: requirements || [],
        customRequirement: customRequirement || '',
        paymentMode: paymentMode || '',
        isAnonymous: isAnonymous || false,
        participants: [{
          openId: OPENID,
          name: isAnonymous ? '匿名喵友' : (creatorName || '神秘喵友'),
          avatar: creatorAvatar || '',
          joinTime: new Date()
        }],
        status: 'active',
        isCompleted: false,
        rating: null,
        createTime: new Date()
      }
    });

    // 如果需要，通知对该店铺感兴趣的用户
    if (notifyInterested) {
      try {
        const interests = await db.collection('shop_dining_interests')
          .where({ shopId: shopId })
          .get();

        if (interests.data.length > 0) {
          const openIds = interests.data.map(item => item.openId);
          console.log('需要通知的用户:', openIds);

          for (const openId of openIds) {
            if (openId !== OPENID) {
              await db.collection('notifications').add({
                data: {
                  type: 'dining_interest',
                  title: '约饭活动提醒',
                  content: `您关注的「${shopName}」有人发起约饭啦！`,
                  openId: openId,
                  shopId: shopId,
                  appointmentId: result._id,
                  isRead: false,
                  createTime: new Date()
                }
              });
            }
          }
        }
      } catch (notifyErr) {
        console.error('通知感兴趣用户失败:', notifyErr);
      }
    }

    return {
      success: true,
      appointmentId: result._id,
      message: '约饭报名发起成功'
    };
  } catch (err) {
    console.error('创建约饭报名失败:', err);
    return { success: false, error: err.message };
  }
};
