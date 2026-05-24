const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 敏感词库（与 cleanupSensitiveContent 保持一致）
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

function containsSensitive(text) {
  if (!text) return false;
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) return true;
  }
  return false;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { limit = 50, mode = '' } = event;

  // 检查用户登录态
  if (!wxContext.OPENID) {
    return {
      success: false,
      error: '用户未登录',
      rooms: []
    };
  }

  try {
    const now = new Date();
    
    let whereClause = {
      status: 'voting', // 只显示进行中的活动
      voteDeadline: _.gt(now) // 过滤已过期的活动（截止时间大于当前时间）
    };

    // 根据模式筛选（兼容旧数据：mode 'b' 也视为聚餐模式）
    if (mode === 'group') {
      whereClause.mode = 'group';
    } else if (mode === 'dining') {
      whereClause.mode = _.in(['pick_for_them', 'b']);
    } else if (mode === 'meal') {
      // 约饭模式不查询 rooms 集合，返回空
      return {
        success: true,
        rooms: []
      };
    } else if (mode === '' || mode === 'all') {
      // 全部模式：查询 group、pick_for_them 和 b
      whereClause.mode = _.in(['group', 'pick_for_them', 'b']);
    }

    // 获取所有进行中的房间（只返回必要字段，脱敏处理）
    const { data: rooms } = await db.collection('rooms')
      .where(whereClause)
      .field({
        _id: true,
        roomId: true,
        title: true,
        status: true,
        mode: true,
        activityDate: true,
        activityTime: true,
        location: true,
        shopName: true,
        shopImage: true,
        platform: true,
        minAmount: true,
        deadline: true,
        createdAt: true,
        voteDeadline: true,
        finalPoster: true,
        candidatePosters: true,
        creatorOpenId: true,
        creatorNickName: true,
        creatorAvatarUrl: true
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (!rooms || rooms.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }

    // 过滤掉 roomId 为空的文档，并过滤违规内容
    const validRooms = rooms.filter(room => {
      if (!room.roomId) {
        console.log('发现 roomId 为空的文档:', room._id, room.title);
        return false;
      }
      // 过滤包含敏感词的内容
      const textToCheck = [room.title, room.location, room.shopName].filter(Boolean).join(' ');
      if (containsSensitive(textToCheck)) {
        console.log('过滤违规房间:', room.roomId, room.title);
        return false;
      }
      return true;
    });
    console.log('有效房间数:', validRooms.length, '原始房间数:', rooms.length);

    // 获取所有房间ID
    const roomIds = validRooms.map(room => room.roomId);

    // 批量获取参与者数量
    let participantCounts = {};
    try {
      const { data: participants } = await db.collection('room_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true })
        .get();

      // 统计每个房间的参与者数量
      participants.forEach(p => {
        participantCounts[p.roomId] = (participantCounts[p.roomId] || 0) + 1;
      });
    } catch (err) {
      console.error('获取参与者数量失败:', err);
    }

    // 对于拼单模式，获取拼单参与者头像
    let participantAvatars = {};
    try {
      const { data: groupParticipants } = await db.collection('group_order_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true, openid: true })
        .get();

      // 按房间分组获取参与者
      const roomParticipantOpenIds = {};
      groupParticipants.forEach(p => {
        if (!roomParticipantOpenIds[p.roomId]) {
          roomParticipantOpenIds[p.roomId] = [];
        }
        roomParticipantOpenIds[p.roomId].push(p.openid);
      });

      // 使用默认头像（脱敏处理，不暴露真实openid）
      for (const roomId of Object.keys(roomParticipantOpenIds)) {
        participantAvatars[roomId] = roomParticipantOpenIds[roomId].map((openid, index) => ({
          avatarUrl: '/assets/images/cat-avatar-icon.png', // 默认头像
          index
          // 注意：不返回 openid
        }));
      }
    } catch (err) {
      console.error('获取拼单参与者头像失败:', err);
    }

    // 组装返回数据（脱敏处理）
    const roomsWithParticipants = validRooms.map(room => ({
      _id: room._id,
      roomId: room.roomId,
      title: room.title,
      status: room.status,
      mode: room.mode,
      activityDate: room.activityDate,
      activityTime: room.activityTime,
      location: room.location,
      shopName: room.shopName,
      shopImage: room.shopImage,
      platform: room.platform,
      minAmount: room.minAmount,
      deadline: room.deadline,
      createdAt: room.createdAt,
      voteDeadline: room.voteDeadline,
      finalPoster: room.finalPoster,
      candidatePosters: room.candidatePosters || [],
      participantCount: participantCounts[room.roomId] || 0,
      creatorNickName: room.creatorNickName || '',
      creatorAvatarUrl: room.creatorAvatarUrl || '',
      // 拼单参与者头像
      participantAvatars: participantAvatars[room.roomId] || []
      // 注意：不返回 creatorOpenId 等敏感字段
    }));

    return {
      success: true,
      rooms: roomsWithParticipants
    };
  } catch (err) {
    console.error('getAllRooms error:', err);
    return {
      success: false,
      error: err.message,
      rooms: []
    };
  }
};
