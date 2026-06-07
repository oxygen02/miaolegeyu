const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, isFromShare = false } = event;

  // 参数校验
  if (!roomId) {
    return {
      code: -1,
      msg: '房间ID不能为空'
    };
  }

  // 检查用户登录态
  if (!wxContext.OPENID) {
    return {
      code: -1,
      msg: '用户未登录'
    };
  }

  try {
    // 获取房间信息（通过roomId字段查询）
    const roomResult = await db.collection('rooms')
      .where({ roomId })
      .limit(1)
      .get();

    if (!roomResult.data || roomResult.data.length === 0) {
      return {
        code: -1,
        msg: '房间不存在或已删除'
      };
    }

    const room = roomResult.data[0];
    console.log('getRoom 查询到房间:', room.roomId);
    console.log('房间 mode:', room.mode);
    console.log('房间 candidatePosters:', room.candidatePosters);
    console.log('房间 candidatePosters 长度:', room.candidatePosters ? room.candidatePosters.length : 'undefined');

    // 检查是否已过期（deadline已过且状态不是locked）
    const now = new Date();
    let effectiveStatus = room.status || 'voting';
    if (effectiveStatus === 'voting' && (room.deadline || room.voteDeadline)) {
      const deadlineDate = new Date(room.deadline || room.voteDeadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate <= now) {
        effectiveStatus = 'ended';
      }
    }

    // 权限校验：检查用户是否是房间参与者或创建者
    const isCreator = room.creatorOpenId === wxContext.OPENID;

    // 可见性校验：如果不是创建者，需要检查可见性权限
    // 注意：通过分享链接进入的用户（isFromShare=true）可绕过好友限制
    if (!isFromShare && !isCreator) {
      const visibility = room.visibility || 'friends';

      // "仅通过分享"的活动：拒绝直接访问，必须通过分享链
      if (visibility === 'share') {
        return {
          code: 403,
          msg: '该活动仅通过分享链接访问'
        };
      }

      // "仅好友可见"的活动：检查是否是好友
      if (visibility === 'friends') {
        // 获取当前用户的好友列表
        let isFriend = false;
        try {
          const { data: users } = await db.collection('users')
            .where({ _openid: wxContext.OPENID })
            .field({ friendOpenids: true })
            .limit(1)
            .get();
          if (users && users.length > 0) {
            const friendOpenids = users[0].friendOpenids || [];
            isFriend = friendOpenids.includes(room.creatorOpenId);
          }
        } catch (err) {
          console.error('获取好友列表失败:', err);
        }

        if (!isFriend) {
          return {
            code: 403,
            msg: '该活动仅好友可见'
          };
        }
      }
      // "公开"活动（visibility === 'public' 或无 visibility 字段）：允许访问
    }

    // 获取参与者列表
    let participants = [];
    try {
      const participantsResult = await db.collection('room_participants')
        .where({ roomId })
        .field({
          openid: true,
          status: true,
          likedIndices: true,
          vetoedIndices: true,
          joinedAt: true
        })
        .get();
      participants = participantsResult.data || [];
    } catch (err) {
      console.error('获取参与者失败:', err);
    }

    // 检查用户是否在参与者列表中
    let isParticipant = participants.some(p => p.openid === wxContext.OPENID);

    // 对于拼单模式，还要检查 group_order_participants
    let isGroupOrderParticipant = false;
    let myGroupOrderSelectedOption = -1;
    let myGroupOrderSelectedOptions = []; // 多选支持
    if (room.mode === 'group' && !isParticipant) {
      try {
        const { data: groupParticipants } = await db.collection('group_order_participants')
          .where({ roomId, openid: wxContext.OPENID })
          .get();
        if (groupParticipants && groupParticipants.length > 0) {
          isGroupOrderParticipant = true;
          const p = groupParticipants[0];
          myGroupOrderSelectedOption = p.selectedOptionIndex || -1;
          // 优先使用新的多选字段
          myGroupOrderSelectedOptions = (p.selectedOptionIndices && p.selectedOptionIndices.length > 0)
            ? p.selectedOptionIndices
            : (myGroupOrderSelectedOption >= 0 ? [myGroupOrderSelectedOption] : []);
        }
      } catch (err) {
        console.error('获取拼单参与者失败:', err);
      }
    }

    // 如果不是创建者也不是参与者，且房间不是公开状态，则拒绝访问
    if (!isCreator && !isParticipant && !isGroupOrderParticipant) {
      // 对于进行中的房间，允许任何人加入
      // 拼单模式需要返回 options 以便用户选择参与
      const isGroupMode = room.mode === 'group';
      let groupOptionStats = [];
      if (isGroupMode) {
        try {
          const { data: groupParticipants } = await db.collection('group_order_participants')
            .where({ roomId })
            .get();
          const options = room.options || [];
          groupOptionStats = options.map((opt, idx) => {
            // 支持多选统计
            const count = (groupParticipants || []).filter(p => {
              if (p.selectedOptionIndices && p.selectedOptionIndices.length > 0) {
                return p.selectedOptionIndices.includes(idx);
              }
              return p.selectedOptionIndex === idx;
            }).length;
            return { index: idx, count };
          });
        } catch (err) {
          console.error('获取拼单统计失败:', err);
        }
      }

      return {
        code: 0,
        data: {
          roomId: room.roomId,
          title: room.title,
          mode: room.mode,
          status: effectiveStatus,
          originalStatus: room.status || 'voting',
          creatorNickName: room.creatorNickName,
          creatorAvatarUrl: room.creatorAvatarUrl,
          // 返回是否需要密码
          needPassword: room.needPassword || false,
          // 不返回敏感信息
          isParticipant: false,
          isCreator: false,
          // 只返回基本的参与者统计
          totalCount: participants.length,
          votedCount: participants.filter(p => p.status === 'voted').length,
          // 拼单模式：返回选项列表和统计数据（供未加入用户选择）
          ...(isGroupMode ? {
            options: room.options || [],
            optionStats: groupOptionStats,
            shopImage: room.shopImage || '',
            shopName: room.shopName || ''
          } : {})
        },
        msg: '获取成功（未加入房间）'
      };
    }

    // 用户是参与者或创建者，返回完整信息
    console.log('用户是参与者或创建者，返回完整信息');
    console.log('房间 candidatePosters 在返回前:', room.candidatePosters);

    // 统计投票情况
    const votedCount = participants.filter(p => p.status === 'voted').length;
    const totalCount = participants.length;

    // 检查当前用户是否已投票
    const currentParticipant = participants.find(p => p.openid === wxContext.OPENID);
    const hasVoted = currentParticipant && currentParticipant.status === 'voted';

    // 如果是拼单模式，获取拼单参与数据
    let groupOrderParticipants = [];
    let optionStats = [];
    let hasJoinedGroupOrder = false;
    let mySelectedOption = -1;
    let mySelectedOptions = []; // 多选支持

    if (room.mode === 'group') {
      try {
        const { data: groupParticipants } = await db.collection('group_order_participants')
          .where({ roomId })
          .get();
        groupOrderParticipants = groupParticipants || [];

        // 统计各选项的选择人数（支持多选：一个人选了多个选项，每个选项都计数）
        const options = room.options || [];
        optionStats = options.map((opt, idx) => {
          // 兼容新旧字段：优先检查 selectedOptionIndices 数组
          const count = groupOrderParticipants.filter(p => {
            if (p.selectedOptionIndices && p.selectedOptionIndices.length > 0) {
              return p.selectedOptionIndices.includes(idx);
            }
            return p.selectedOptionIndex === idx;
          }).length;
          return { index: idx, count };
        });

        // 检查当前用户是否已参与（优先使用之前查询的结果）
        if (isGroupOrderParticipant) {
          hasJoinedGroupOrder = true;
          mySelectedOption = myGroupOrderSelectedOption;
          mySelectedOptions = myGroupOrderSelectedOptions; // 多选
        } else {
          const myParticipation = groupOrderParticipants.find(p => p.openid === wxContext.OPENID);
          hasJoinedGroupOrder = !!myParticipation;
          mySelectedOption = myParticipation ? myParticipation.selectedOptionIndex : -1;
          // 多选支持
          mySelectedOptions = (myParticipation && myParticipation.selectedOptionIndices && myParticipation.selectedOptionIndices.length > 0)
            ? myParticipation.selectedOptionIndices
            : (mySelectedOption >= 0 ? [mySelectedOption] : []);
        }
      } catch (err) {
        console.error('获取拼单参与者失败:', err);
      }
    }

    // 脱敏处理：不返回创建者的完整openid
    return {
      code: 0,
      data: {
        ...room,
        status: effectiveStatus,
        originalStatus: room.status || 'voting',
        // 移除敏感字段
        creatorOpenId: undefined,
        // 返回参与者信息（脱敏）
        participants: participants.map(p => ({
          status: p.status,
          hasVoted: p.status === 'voted',
          joinedAt: p.joinedAt,
          isMe: p.openid === wxContext.OPENID
        })),
        votedCount,
        totalCount,
        hasVoted,
        isCreator: isCreator,
        // 拼单相关数据
        groupOrderParticipants: groupOrderParticipants.map(p => ({
          selectedOptionIndex: p.selectedOptionIndex,
          joinedAt: p.joinedAt,
          isMe: p.openid === wxContext.OPENID
        })),
        optionStats,
        hasJoinedGroupOrder,
        mySelectedOption,
        mySelectedOptions
      },
      msg: '获取成功'
    };
  } catch (e) {
    console.error('getRoom error:', e);
    return {
      code: -1,
      msg: e.message || '获取房间信息失败'
    };
  }
};
