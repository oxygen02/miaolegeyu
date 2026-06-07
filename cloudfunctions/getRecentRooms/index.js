const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 敏感词库
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
  // 限制最大返回数量，防止数据过大
  const limit = Math.min(parseInt(event.limit) || 10, 100);
  const { mode = '' } = event;
  
  try {
    // 获取用户参与过的房间（使用 room_participants 集合）
    const participantResult = await db.collection('room_participants')
      .where({ openid: wxContext.OPENID })
      .orderBy('joinedAt', 'desc')
      .limit(limit)
      .get();
    
    const roomIds = participantResult.data.map(p => p.roomId);
    
    if (roomIds.length === 0) {
      return {
        success: true,
        rooms: []
      };
    }
    
    // 构建房间查询条件
    let roomWhereClause = {
      roomId: _.in(roomIds)
    };
    
    // 根据模式筛选（兼容旧数据：mode 'b' 也视为聚餐模式）
    if (mode === 'group') {
      roomWhereClause.mode = 'group';
    } else if (mode === 'dining') {
      // 聚餐模式：包括 "你们来定"(pick_for_them/b) 和 "我选好了"(a)
      roomWhereClause.mode = _.in(['pick_for_them', 'b', 'a']);
    } else if (mode === 'meal') {
      roomWhereClause.mode = 'meal';
    }
    
    // 获取房间详情（使用 roomId 字段查询）
    const roomResult = await db.collection('rooms')
      .where(roomWhereClause)
      .get();
    
    // 按参与时间排序
    const roomMap = {};
    roomResult.data.forEach(room => {
      roomMap[room.roomId] = room;
    });
    
    const now = new Date();
    const rooms = roomIds.map(id => {
      const room = roomMap[id];
      if (!room) return null;
      // 过滤违规内容
      const textToCheck = [room.title, room.location, room.shopName].filter(Boolean).join(' ');
      if (containsSensitive(textToCheck)) {
        console.log('过滤违规房间:', room.roomId, room.title);
        return null;
      }

      // 检查是否已过期（deadline已过且状态不是locked）
      let effectiveStatus = room.status || 'voting';
      if (effectiveStatus === 'voting' && (room.deadline || room.voteDeadline)) {
        const deadlineDate = new Date(room.deadline || room.voteDeadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate <= now) {
          effectiveStatus = 'ended';
        }
      }

      return {
        _id: room._id,
        roomId: room.roomId,
        title: room.title,
        status: effectiveStatus,
        originalStatus: room.status || 'voting',
        mode: room.mode,
        candidatePosters: room.candidatePosters || [],
        createdAt: room.createdAt,
        location: room.location,
        activityTime: room.activityTime,
        participantCount: room.participantCount || 0
        // 注意：不返回 creatorOpenId 等敏感字段
      };
    }).filter(Boolean);
    
    return {
      success: true,
      rooms
    };
  } catch (err) {
    console.error('getRecentRooms error:', err);
    return {
      success: false,
      error: err.message
    };
  }
};
