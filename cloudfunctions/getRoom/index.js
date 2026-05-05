const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId } = event;

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
        msg: '房间不存在'
      };
    }

    const room = roomResult.data[0];
    console.log('getRoom 查询到房间:', room.roomId);
    console.log('房间 mode:', room.mode);
    console.log('房间 candidatePosters:', room.candidatePosters);
    console.log('房间 candidatePosters 长度:', room.candidatePosters ? room.candidatePosters.length : 'undefined');

    // 权限校验：检查用户是否是房间参与者或创建者
    // 只有参与者或创建者才能查看房间详情
    const isCreator = room.creatorOpenId === wxContext.OPENID;

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
    const isParticipant = participants.some(p => p.openid === wxContext.OPENID);

    // 如果不是创建者也不是参与者，且房间不是公开状态，则拒绝访问
    if (!isCreator && !isParticipant) {
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
            const count = (groupParticipants || []).filter(p => p.selectedOptionIndex === idx).length;
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
          status: room.status,
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

    if (room.mode === 'group') {
      try {
        const { data: groupParticipants } = await db.collection('group_order_participants')
          .where({ roomId })
          .get();
        groupOrderParticipants = groupParticipants || [];

        // 统计各选项的选择人数
        const options = room.options || [];
        optionStats = options.map((opt, idx) => {
          const count = groupOrderParticipants.filter(p => p.selectedOptionIndex === idx).length;
          return { index: idx, count };
        });

        // 检查当前用户是否已参与
        const myParticipation = groupOrderParticipants.find(p => p.openid === wxContext.OPENID);
        hasJoinedGroupOrder = !!myParticipation;
        mySelectedOption = myParticipation ? myParticipation.selectedOptionIndex : -1;
      } catch (err) {
        console.error('获取拼单参与者失败:', err);
      }
    }

    // 脱敏处理：不返回创建者的完整openid
    return {
      code: 0,
      data: {
        ...room,
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
        mySelectedOption
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
