const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const SENSITIVE_WORDS = [
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

const TEXT_CHECK_TIMEOUT = 8000;
const DOWNLOAD_TIMEOUT = 8000;
const IMG_CHECK_TIMEOUT = 5000;

function checkSensitiveWords(text) {
  if (!text) return { hasSensitive: false };
  const foundWords = [];
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) foundWords.push(word);
  }
  return { hasSensitive: foundWords.length > 0, words: foundWords };
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('检测超时')), ms);
    promise.then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function checkWithWxApi(content) {
  try {
    const result = await withTimeout(
      cloud.openapi.security.msgSecCheck({
        version: 2,
        content: content,
        openid: cloud.getWXContext().OPENID,
        scene: 2
      }),
      TEXT_CHECK_TIMEOUT
    );
    console.log('msgSecCheck 返回:', JSON.stringify(result));
    if (result.errcode === 87014 || result.result?.suggest === 'risky') {
      return { passed: false, msg: '所发布内容含违规信息' };
    }
    return { passed: true, msg: '内容审核通过' };
  } catch (err) {
    if (err.message === '检测超时') {
      console.error('msgSecCheck 调用超时');
      return { passed: true, msg: '检测超时，已放行' };
    }
    console.error('msgSecCheck 调用失败:', err.message);
    return { passed: true, msg: '检测服务暂不可用，已放行' };
  }
}

async function checkImageWithWxApi(mediaUrl, openid) {
  console.log('开始检查图片:', mediaUrl);
  if (!mediaUrl || !mediaUrl.startsWith('cloud://')) {
    return { passed: true, msg: '跳过非云存储图片' };
  }

  try {
    const res = await withTimeout(
      cloud.downloadFile({ fileID: mediaUrl }),
      DOWNLOAD_TIMEOUT
    );
    const imageBuffer = res.fileContent;

    let contentType = 'image/png';
    if (mediaUrl.endsWith('.jpg') || mediaUrl.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (mediaUrl.endsWith('.gif')) contentType = 'image/gif';

    const result = await withTimeout(
      cloud.openapi.security.imgSecCheck({
        media: { contentType, value: imageBuffer },
        openid: openid,
        scene: 2
      }),
      IMG_CHECK_TIMEOUT
    );

    console.log('imgSecCheck 返回:', JSON.stringify(result));

    if (result.errcode === 87014) {
      return { passed: false, msg: '所发布内容含违规信息' };
    }
    return { passed: true, msg: '图片审核通过' };
  } catch (err) {
    if (err.message === '检测超时') {
      console.error('图片检测超时:', mediaUrl);
      return { passed: true, msg: '检测超时，已放行' };
    }
    if (err.errCode === 87014) {
      console.error('imgSecCheck 检测到违规图片:', mediaUrl);
      return { passed: false, msg: '所发布内容含违规信息' };
    }
    console.error('imgSecCheck 调用失败:', err.message, err.errCode);
    return { passed: true, msg: '检测服务暂不可用，已放行' };
  }
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, title, location, peopleCount, activityDate, activityTime, candidatePosters, voteDeadline, timeAuxiliary, enableRestaurantRecommend, dinnerTime, paymentMode, isAnonymous, needPassword, roomPassword } = event;

  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  try {
    // 权限检查（先做，快速失败）
    const roomResult = await db.collection('rooms')
      .where({ roomId: roomId, creatorOpenId: wxContext.OPENID })
      .get();

    if (roomResult.data.length === 0) {
      return { code: -1, msg: '无权编辑此活动' };
    }

    const room = roomResult.data[0];

    if (room.voteDeadline) {
      const deadline = new Date(room.voteDeadline);
      const now = new Date();
      if (deadline < now) {
        return { code: -1, msg: '投票已截止，无法编辑' };
      }
    }

    const contentToCheck = [title, location].filter(Boolean).join(' ');

    // 本地敏感词检查
    if (contentToCheck) {
      const localCheck = checkSensitiveWords(contentToCheck);
      if (localCheck.hasSensitive) {
        console.log('本地敏感词检测到违规:', localCheck.words);
        return { code: 403, msg: '所发布内容含违规信息' };
      }
    }

    // 收集所有需要检查的图片
    const imagesToCheck = (candidatePosters || [])
      .map(p => typeof p === 'string' ? p : (p.imageUrl || ''))
      .filter(url => url && url.startsWith('cloud://'));

    // 并行执行：文字安全检测 + 所有图片安全检测
    const checkTasks = [];

    if (contentToCheck) {
      checkTasks.push(
        checkWithWxApi(contentToCheck).then(r => ({ type: 'text', ...r }))
      );
    }

    for (const imageUrl of imagesToCheck) {
      checkTasks.push(
        checkImageWithWxApi(imageUrl, wxContext.OPENID).then(r => ({ type: 'image', url: imageUrl, ...r }))
      );
    }

    if (checkTasks.length > 0) {
      console.log(`开始并行安全检测：文字${contentToCheck ? 1 : 0}项 + 图片${imagesToCheck.length}项`);
      const checkResults = await Promise.all(checkTasks);

      for (const result of checkResults) {
        console.log(`安全检测结果 [${result.type}]:`, result.passed ? '通过' : '违规', result.url || '');
        if (!result.passed) {
          return { code: 403, msg: '所发布内容含违规信息' };
        }
      }
      console.log('所有内容安全检测通过');
    }

    // 安全检测全部通过，更新房间
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