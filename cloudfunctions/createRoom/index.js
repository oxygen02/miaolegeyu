const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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
      roomData.paymentMode = paymentMode || 'AA';
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
