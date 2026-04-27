const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 生成6位数字房间号
function generateRoomId() {
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += Math.floor(Math.random() * 10);
  }
  return roomId;
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
    optionCount
  } = event;
  
  try {
    // 使用传入的roomId，如果没有则生成
    const roomId = inputRoomId || generateRoomId();
    
    // 解析时间
    let appointmentDate = null;
    if (dinnerTime) {
      appointmentDate = new Date(dinnerTime);
    }
    
    let deadline = voteDeadline ? new Date(voteDeadline) : new Date(Date.now() + 24 * 3600 * 1000);
    
    // 创建房间数据
    const roomData = {
      roomId,
      title: title || '未命名聚餐',
      mode: mode || 'a',
      platform: platform || '',
      location: location || '',
      peopleCount: peopleCount || 0,
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
      updatedAt: db.serverDate()
    };
    
    // mode-b 字段
    if (mode === 'b') {
      roomData.cuisineOptions = cuisineOptions || [];
      roomData.paymentMode = paymentMode || 'AA';
      roomData.isAnonymous = isAnonymous || false;
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
    
    // 创建房间
    await db.collection('rooms').add({ data: roomData });
    
    // 创建参与者记录
    await db.collection('room_participants').add({
      data: {
        roomId,
        openid: wxContext.OPENID,
        role: 'creator',
        status: 'joined',
        vote: null,
        joinedAt: db.serverDate()
      }
    });
    
    return { 
      code: 0, 
      data: { roomId },
      msg: '创建成功'
    };
    
  } catch(e) { 
    console.error('创建失败:', e);
    return { 
      code: -1, 
      msg: e.message || '创建失败'
    };
  }
};
