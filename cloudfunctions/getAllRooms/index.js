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
  const { limit = 50, mode = '', shareCode = '' } = event;

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
    const currentOpenId = wxContext.OPENID;

    // 基础查询条件：只显示进行中的活动
    let baseWhereClause = {
      status: 'voting',
      voteDeadline: _.gt(now)
    };

    // 根据模式筛选（兼容旧数据：mode 'b' 也视为聚餐模式）
    if (mode === 'group') {
      baseWhereClause.mode = 'group';
    } else if (mode === 'dining') {
      // 聚餐模式：包括 "你们来定"(pick_for_them/b) 和 "我选好了"(a)
      baseWhereClause.mode = _.in(['pick_for_them', 'b', 'a']);
    } else if (mode === 'meal') {
      // 约饭模式不查询 rooms 集合，返回空
      return {
        success: true,
        rooms: []
      };
    } else if (mode === '' || mode === 'all') {
      // 全部模式：查询 group、pick_for_them、b 和 a（我选好了）
      baseWhereClause.mode = _.in(['group', 'pick_for_them', 'b', 'a']);
    }

    // 如果有分享码，通过分享链查询
    if (shareCode) {
      return await queryByShareChain(shareCode, baseWhereClause, limit);
    }

    // 获取当前用户信息（好友列表和城市）
    let userInfo = null;
    try {
      const { data: users } = await db.collection('users')
        .where({ _openid: currentOpenId })
        .limit(1)
        .field({
          friendOpenids: true,
          userCity: true
        })
        .get();

      if (users && users.length > 0) {
        userInfo = users[0];
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }

    // 获取用户曾通过分享链访问过的房间ID（确保分享传播性）
    let sharedRoomIds = [];
    try {
      const { data: visitedChains } = await db.collection('shareChains')
        .where(_.or([
          { creatorOpenId: currentOpenId },  // 我发起的分享
          _.and([
            { expireTime: _.gt(now) },  // 分享链未过期
            _.or([
              { sourceOpenid: currentOpenId },  // 我是分享接收者（旧字段）
              { visitorOpenids: currentOpenId }  // 我是访问者（新字段）
            ])
          ])
        ]))
        .field({ targetId: true, roomId: true })
        .limit(50)
        .get();

      if (visitedChains && visitedChains.length > 0) {
        sharedRoomIds = [...new Set(visitedChains.map(c => c.targetId || c.roomId).filter(Boolean))];
      }
    } catch (err) {
      console.error('获取分享链记录失败:', err);
    }

    // 构建隐私过滤条件（传入分享过的房间ID）
    const privacyWhereClause = buildPrivacyWhereClause(currentOpenId, userInfo, sharedRoomIds);

    // 合并基础条件和隐私条件
    const finalWhereClause = _.and([
      baseWhereClause,
      privacyWhereClause
    ]);

    // 获取符合条件的房间
    const { data: rooms } = await db.collection('rooms')
      .where(finalWhereClause)
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
        creatorAvatarUrl: true,
        visibility: true,
        city: true
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

    // 批量获取参与者数量和当前用户的投票状态
    let participantCounts = {};
    let userVoteStatus = {}; // roomId -> 'voted' | 'joined' | null
    try {
      const { data: participants } = await db.collection('room_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true, openid: true, status: true })
        .get();

      // 统计每个房间的参与者数量
      participants.forEach(p => {
        participantCounts[p.roomId] = (participantCounts[p.roomId] || 0) + 1;
        // 记录当前用户的投票状态
        if (p.openid === currentOpenId) {
          userVoteStatus[p.roomId] = p.status; // 'voted' 或 'joined'
        }
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

      // 按房间分组获取参与者 openid
      const roomParticipantOpenIds = {};
      groupParticipants.forEach(p => {
        if (!roomParticipantOpenIds[p.roomId]) {
          roomParticipantOpenIds[p.roomId] = [];
        }
        roomParticipantOpenIds[p.roomId].push(p.openid);
      });

      // 收集所有需要去查询头像的 openid
      const allOpenIds = [...new Set(groupParticipants.map(p => p.openid))];
      // 查询 users 集合获取真实头像
      let userAvatarMap = {};
      if (allOpenIds.length > 0) {
        try {
          const { data: users } = await db.collection('users')
            .where({
              _openid: _.in(allOpenIds)
            })
            .field({ _openid: true, avatarUrl: true })
            .get();
          users.forEach(u => {
            userAvatarMap[u._openid] = u.avatarUrl || '';
          });
        } catch (userErr) {
          console.error('查询用户头像失败:', userErr);
        }
      }

      // 组装头像数据
      for (const roomId of Object.keys(roomParticipantOpenIds)) {
        participantAvatars[roomId] = roomParticipantOpenIds[roomId].map((openid, index) => ({
          avatarUrl: userAvatarMap[openid] || '/assets/images/cat-avatar-icon.png',
          index
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
      deadline: room.deadline || room.voteDeadline,
      createdAt: room.createdAt,
      voteDeadline: room.voteDeadline,
      finalPoster: room.finalPoster,
      candidatePosters: room.candidatePosters || [],
      participantCount: participantCounts[room.roomId] || 0,
      creatorNickName: room.creatorNickName || '',
      creatorAvatarUrl: room.creatorAvatarUrl || '',
      visibility: room.visibility || 'friends',
      city: room.city || null,
      // 拼单参与者头像
      participantAvatars: participantAvatars[room.roomId] || [],
      // 当前用户在该房间的参与/投票状态
      hasVoted: userVoteStatus[room.roomId] === 'voted',
      hasJoined: !!userVoteStatus[room.roomId]
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

/**
 * 构建隐私过滤条件
 * 规则：
 * 1. 自己创建的活动始终可见
 * 2. "仅好友可见"的活动：仅好友创建的可看（同城逻辑已移除，严格按好友关系）
 * 3. "仅通过分享"的活动：不在列表中显示（只能通过分享链接进入）
 * 4. 公开活动（visibility: 'public' 或无 visibility 字段的旧数据）：全部可见
 * 5. 分享传播性：用户曾通过分享链访问过的房间（sharedRoomIds）也对其可见
 */
function buildPrivacyWhereClause(currentOpenId, userInfo, sharedRoomIds = []) {
  const friendOpenids = userInfo?.friendOpenids || [];

  // 条件1：自己创建的活动始终可见
  const myRooms = { creatorOpenId: currentOpenId };

  // 条件2：好友创建的"仅好友可见"活动
  const friendsVisibleRooms = _.and([
    { visibility: 'friends' },
    { creatorOpenId: _.in(friendOpenids) }
  ]);

  // 条件3：公开活动（包括无 visibility 字段的旧数据）
  const publicRooms = _.or([
    { visibility: 'public' },
    { visibility: _.exists(false) }
  ]);

  // 条件4（新增）：分享传播性 - 用户曾通过分享链访问过的房间
  // 对于 visibility='friends' 的活动，如果该房间在 sharedRoomIds 中，也对当前用户可见
  let sharedVisibleRooms = null;
  if (sharedRoomIds && sharedRoomIds.length > 0) {
    sharedVisibleRooms = _.and([
      { roomId: _.in(sharedRoomIds) }
    ]);
  }

  // 组合条件：自己的活动 OR 好友的"仅好友可见"活动 OR 公开活动 OR 分享过的活动
  let conditions = [myRooms, friendsVisibleRooms, publicRooms];
  if (sharedVisibleRooms) {
    conditions.push(sharedVisibleRooms);
  }

  return _.or(conditions);
}

/**
 * 通过分享链查询房间
 */
async function queryByShareChain(shareCode, baseWhereClause, limit) {
  try {
    // 查询分享链记录
    const { data: chains } = await db.collection('shareChains')
      .where({
        shareCode: shareCode,
        expireTime: _.gt(new Date())
      })
      .limit(1)
      .get();

    if (!chains || chains.length === 0) {
      return {
        success: false,
        error: '分享链接已过期或不存在',
        rooms: []
      };
    }

    const chain = chains[0];
    
    // 查询被分享的房间
    const { data: rooms } = await db.collection('rooms')
      .where(_.and([
        baseWhereClause,
        { roomId: chain.roomId }
      ]))
      .limit(1)
      .get();

    if (!rooms || rooms.length === 0) {
      return {
        success: false,
        error: '活动已结束或不存在',
        rooms: []
      };
    }

    // 记录访问者信息（可选）
    try {
      await db.collection('shareChains').doc(chain._id).update({
        data: {
          visitCount: _.inc(1),
          lastVisitTime: new Date()
        }
      });
    } catch (err) {
      console.error('更新分享链访问次数失败:', err);
    }

    return {
      success: true,
      rooms: rooms,
      isFromShare: true
    };
  } catch (err) {
    console.error('通过分享链查询失败:', err);
    return {
      success: false,
      error: err.message,
      rooms: []
    };
  }
}