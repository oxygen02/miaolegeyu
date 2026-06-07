const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

function generateRoomId() {
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += Math.floor(Math.random() * 10);
  }
  return roomId;
}

async function generateUniqueRoomId(db) {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const roomId = generateRoomId();
    const existing = await db.collection('rooms').where({ roomId }).get();
    if (existing.data.length === 0) {
      return roomId;
    }
    attempts++;
    console.log(`房间号碰撞，第${attempts}次重试...`);
  }

  throw new Error('无法生成唯一房间号，请稍后重试');
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const {
    roomId: inputRoomId,
    title,
    mode,
    platform,
    candidatePosters,
    voteDeadline,
    timeAuxiliary,
    groupOrderOption,
    activityDate,
    activityTime,
    location,
    peopleCount,
    dinnerTime,
    cuisineOptions,
    paymentMode,
    isAnonymous,
    creatorNickName,
    creatorAvatarUrl,
    options,
    optionCount,
    needPassword,
    roomPassword,
    enableRestaurantRecommend,
    // 隐私设置
    visibility,
    city
  } = event;

  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  try {
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

    // 生成房间号
    let roomId;
    if (inputRoomId) {
      const existingRoom = await db.collection('rooms').where({ roomId: inputRoomId }).get();
      if (existingRoom.data.length > 0) {
        return { code: -1, msg: '房间号已存在，请更换' };
      }
      roomId = inputRoomId;
    } else {
      roomId = await generateUniqueRoomId(db);
    }

    let appointmentDate = null;
    if (dinnerTime) {
      appointmentDate = new Date(dinnerTime);
    }

    const deadline = voteDeadline ? new Date(voteDeadline) : new Date(Date.now() + 24 * 3600 * 1000);

    console.log('createRoom 接收参数:');
    console.log('mode:', mode);
    console.log('candidatePosters:', candidatePosters);
    console.log('candidatePosters 长度:', candidatePosters ? candidatePosters.length : 'undefined');

    const roomData = {
      roomId,
      title: title || '未命名聚餐',
      mode: mode || 'a',
      platform: platform || '',
      location: location || '',
      peopleCount: peopleCount || 0,
      activityDate: activityDate || '',
      activityTime: activityTime || '',
      creatorOpenId: wxContext.OPENID,
      creatorNickName: creatorNickName || '',
      creatorAvatarUrl: creatorAvatarUrl || '',
      status: 'voting',
      candidatePosters: candidatePosters || [],
      voteDeadline: deadline,
      appointmentDate: appointmentDate,
      timeAuxiliary: timeAuxiliary || false,
      groupOrderOption: groupOrderOption || false,
      deadlineReminderSent: false,
      activityStartReminderSent: false,
      voteResultSent: false,
      finalPoster: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      // 隐私设置
      visibility: visibility || 'friends',
      city: city || null
    };

    console.log('roomData.candidatePosters:', roomData.candidatePosters);
    console.log('roomData.candidatePosters 长度:', roomData.candidatePosters.length);

    if (mode === 'b' || mode === 'pick_for_them') {
      roomData.cuisineOptions = cuisineOptions || [];
      roomData.paymentMode = paymentMode || '';
      roomData.isAnonymous = isAnonymous || false;
      roomData.needPassword = needPassword || false;
      roomData.roomPassword = needPassword ? crypto.createHash('md5').update(roomPassword).digest('hex') : '';
      roomData.enableRestaurantRecommend = enableRestaurantRecommend || false;
    }

    if (mode === 'group') {
      roomData.options = options || [];
      roomData.optionCount = optionCount || 0;
      if (options && options.length > 0 && options[0].title) {
        roomData.title = options[0].title;
        roomData.shopName = options[0].title;
      }
      if (options && options.length > 0 && options[0].shopImage) {
        roomData.shopImage = options[0].shopImage;
      }
      if (options && options.length > 0 && options[0].platform) {
        roomData.platform = options[0].platform;
      }
    }

    const transaction = await db.startTransaction();

    try {
      console.log('准备写入数据库，roomData.candidatePosters:', roomData.candidatePosters);
      await transaction.collection('rooms').add({ data: roomData });
      console.log('房间创建成功，roomId:', roomId);

      await transaction.collection('room_participants').add({
        data: {
          roomId,
          openid: wxContext.OPENID,
          role: 'creator',
          status: 'joined',
          vote: null,
          joinedAt: db.serverDate()
        }
      });

      await transaction.commit();

      return {
        code: 0,
        data: { roomId },
        msg: '创建成功'
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

  } catch (e) {
    console.error('创建失败:', e);
    return {
      code: -1,
      msg: e.message || '创建失败'
    };
  }
};