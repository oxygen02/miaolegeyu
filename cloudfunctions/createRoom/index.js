const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
 * 调用微信官方内容安全API
 */
async function checkWithWxApi(content) {
  try {
    const result = await cloud.openapi.security.msgSecCheck({
      version: 2,
      content: content,
      openid: cloud.getWXContext().OPENID,
      scene: 2
    });
    return {
      passed: result.result?.suggest === 'pass' && result.result?.label === 100,
      detail: result.result
    };
  } catch (err) {
    console.error('微信内容安全API调用失败:', err);
    // API调用失败时返回失败，避免违规内容被创建
    return { passed: false, errMsg: err.message || 'API调用失败' };
  }
}

/**
 * 调用微信官方图片内容安全API
 */
async function checkImageWithWxApi(mediaUrl, openid, scene = 2) {
  try {
    let imageBuffer;
    let contentType = 'image/png';
    
    // 下载云存储文件
    if (mediaUrl.startsWith('cloud://')) {
      const res = await cloud.downloadFile({ fileID: mediaUrl });
      imageBuffer = res.fileContent;
      if (mediaUrl.endsWith('.jpg') || mediaUrl.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (mediaUrl.endsWith('.png')) {
        contentType = 'image/png';
      } else if (mediaUrl.endsWith('.gif')) {
        contentType = 'image/gif';
      }
    } else {
      throw new Error('不支持的图片格式');
    }
    
    const result = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: contentType,
        value: imageBuffer
      },
      openid: openid,
      scene: scene
    });
    
    return {
      passed: result.result?.suggest === 'pass' && result.result?.label === 100,
      suggest: result.result?.suggest || 'pass',
      label: result.result?.label || 100
    };
  } catch (err) {
    console.error('图片内容安全API调用失败:', err);
    // API调用失败时返回失败，避免违规图片被创建
    return { passed: false, errMsg: err.message || '图片检测失败' };
  }
}

// 生成6位数字房间号
function generateRoomId() {
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += Math.floor(Math.random() * 10);
  }
  return roomId;
}

// 生成唯一房间号（带重试机制）
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
    enableRestaurantRecommend
  } = event;
  
  // 参数校验
  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }
  
  try {
    // 内容安全检查（防止绕过前端直接调用）
    const contentToCheck = [title, location].filter(Boolean).join(' ');
    if (contentToCheck) {
      // 本地敏感词检查
      const localCheck = checkSensitiveWords(contentToCheck);
      if (localCheck.hasSensitive) {
        return { code: 403, msg: '内容包含违规信息，请修改后重试' };
      }
      
      // 微信官方API检查
      const wxCheck = await checkWithWxApi(contentToCheck);
      if (!wxCheck.passed) {
        return { code: 403, msg: '内容包含违规信息，请修改后重试' };
      }
    }
    
    // 图片内容安全检查（仅作为辅助检测，不阻塞正常用户）
    console.log('开始图片内容安全检查，海报数量:', candidatePosters?.length || 0);
    if (candidatePosters && candidatePosters.length > 0) {
      for (let i = 0; i < candidatePosters.length; i++) {
        const poster = candidatePosters[i];
        const imageUrl = poster.imageUrl || poster;
        console.log(`检查第${i + 1}张图片:`, imageUrl);
        if (imageUrl && imageUrl.startsWith('cloud://')) {
          try {
            const imageCheck = await checkImageWithWxApi(imageUrl, wxContext.OPENID);
            console.log(`图片检测结果:`, imageCheck);
            // 只有明确检测到违规内容才拦截（label > 100 且 suggest === 'risky'）
            if (!imageCheck.passed && imageCheck.label > 100 && imageCheck.suggest === 'risky') {
              console.log(`图片检测未通过:`, imageCheck);
              return { code: 403, msg: '图片包含违规内容，请更换后重试' };
            }
            // API 调用失败或其他情况，记录日志但不拦截
            if (!imageCheck.passed) {
              console.log(`图片检测服务异常，放行:`, imageCheck.errMsg || '未知错误');
            }
          } catch (imgErr) {
            console.error('图片检测异常，放行:', imgErr);
            // API 异常时不阻塞用户
          }
        } else {
          console.log(`跳过非云存储图片:`, imageUrl);
        }
      }
    }
    
    // 使用传入的roomId，如果没有则生成唯一房间号
    let roomId;
    if (inputRoomId) {
      // 检查传入的roomId是否已存在
      const existingRoom = await db.collection('rooms').where({ roomId: inputRoomId }).get();
      if (existingRoom.data.length > 0) {
        return { code: -1, msg: '房间号已存在，请更换' };
      }
      roomId = inputRoomId;
    } else {
      // 自动生成唯一房间号（带重试机制）
      roomId = await generateUniqueRoomId(db);
    }
    
    // 解析时间
    let appointmentDate = null;
    if (dinnerTime) {
      appointmentDate = new Date(dinnerTime);
    }
    
    let deadline = voteDeadline ? new Date(voteDeadline) : new Date(Date.now() + 24 * 3600 * 1000);
    
    // 创建房间数据
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
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后自动过期
    };

    console.log('roomData.candidatePosters:', roomData.candidatePosters);
    console.log('roomData.candidatePosters 长度:', roomData.candidatePosters.length);
    
    // mode-b 字段（你们来定）
    // 支持 'b' 和 'pick_for_them' 两种 mode 值
    if (mode === 'b' || mode === 'pick_for_them') {
      roomData.cuisineOptions = cuisineOptions || [];
      roomData.paymentMode = paymentMode || '';
      roomData.isAnonymous = isAnonymous || false;
      roomData.needPassword = needPassword || false;
      // 密码使用md5哈希存储，避免明文
      roomData.roomPassword = needPassword ? crypto.createHash('md5').update(roomPassword).digest('hex') : '';
      roomData.enableRestaurantRecommend = enableRestaurantRecommend || false;
    }
    
    // 拼单模式字段
    if (mode === 'group') {
      roomData.options = options || [];
      roomData.optionCount = optionCount || 0;
      // 使用第一个选项的标题作为房间标题
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
    
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction();
    
    try {
      // 创建房间
      console.log('准备写入数据库，roomData.candidatePosters:', roomData.candidatePosters);
      await transaction.collection('rooms').add({ data: roomData });
      console.log('房间创建成功，roomId:', roomId);

      // 创建参与者记录
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
      
      // 提交事务
      await transaction.commit();
      
      return { 
        code: 0, 
        data: { roomId },
        msg: '创建成功'
      };
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
    
  } catch(e) { 
    console.error('创建失败:', e);
    return { 
      code: -1, 
      msg: e.message || '创建失败'
    };
  }
};
