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
 * 调用微信官方内容安全API (msgSecCheck)
 * 策略：只有明确返回 risky 才拦截，API 错误时放行
 */
async function checkWithWxApi(content) {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: cloud.getWXContext().OPENID,
      scene: 2
    });

    console.log('msgSecCheck 返回:', JSON.stringify(result));

    const suggest = result.result?.suggest;

    // 只有明确返回 risky 才拦截
    if (suggest === 'risky') {
      return {
        passed: false,
        suggest: suggest,
        detail: result.result,
        msg: '内容包含违规信息'
      };
    }

    // pass 或 review 都视为通过
    return {
      passed: true,
      suggest: suggest || 'pass',
      detail: result.result,
      msg: '内容审核通过'
    };
  } catch (err) {
    console.error('微信内容安全API调用失败:', err);
    // API 调用失败时放行，避免阻塞正常用户
    return {
      passed: true,
      errMsg: err.message || 'API调用失败',
      msg: '检测服务暂不可用，已放行'
    };
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, title, location, peopleCount, activityDate, activityTime, candidatePosters, voteDeadline, timeAuxiliary, enableRestaurantRecommend, dinnerTime, paymentMode, isAnonymous, needPassword, roomPassword } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  try {
    // 内容安全检查（防止绕过前端直接调用）
    const contentToCheck = [title, location].filter(Boolean).join(' ');
    if (contentToCheck) {
      // 本地敏感词检查
      const localCheck = checkSensitiveWords(contentToCheck);
      if (localCheck.hasSensitive) {
        return { code: 403, msg: '所发布内容含违规信息' };
      }

      // 微信官方API检查
      const wxCheck = await checkWithWxApi(contentToCheck);
      if (wxCheck.passed === false && wxCheck.suggest === 'risky') {
        return { code: 403, msg: '所发布内容含违规信息' };
      }
    }

    // 检查是否是创建者
    const roomResult = await db.collection('rooms')
      .where({
        roomId: roomId,
        creatorOpenId: wxContext.OPENID
      })
      .get();

    if (roomResult.data.length === 0) {
      return { code: -1, msg: '无权编辑此活动' };
    }

    const room = roomResult.data[0];

    // 检查是否已截止
    if (room.voteDeadline) {
      const deadline = new Date(room.voteDeadline);
      const now = new Date();
      if (deadline < now) {
        return { code: -1, msg: '投票已截止，无法编辑' };
      }
    }

    // 更新房间数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (location !== undefined) updateData.location = location;
    if (peopleCount !== undefined) updateData.peopleCount = peopleCount;
    if (activityDate !== undefined) updateData.activityDate = activityDate;
    if (activityTime !== undefined) updateData.activityTime = activityTime;
    if (candidatePosters !== undefined) updateData.candidatePosters = candidatePosters;
    if (voteDeadline !== undefined) updateData.voteDeadline = voteDeadline;
    if (timeAuxiliary !== undefined) updateData.timeAuxiliary = timeAuxiliary;
    if (enableRestaurantRecommend !== undefined) updateData.enableRestaurantRecommend = enableRestaurantRecommend;
    if (dinnerTime !== undefined && dinnerTime !== null) updateData.appointmentDate = new Date(dinnerTime);
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
    if (needPassword !== undefined) updateData.needPassword = needPassword;
    if (roomPassword !== undefined) updateData.roomPassword = roomPassword;
    updateData.updatedAt = db.serverDate();

    await db.collection('rooms')
      .where({ roomId })
      .update({ data: updateData });

    return {
      code: 0,
      msg: '更新成功',
      success: true
    };
  } catch (err) {
    console.error('updateRoom error:', err);
    return { code: -1, msg: err.message || '更新失败' };
  }
};
