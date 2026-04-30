const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { status = 'all', mode = '' } = event;

  try {
    let whereClause = {
      creatorOpenId: wxContext.OPENID
    };
    
    // 根据状态筛选
    if (status === 'voting') {
      whereClause.status = 'voting';
    } else if (status === 'locked') {
      whereClause.status = 'locked';
    }
    
    // 根据模式筛选（group=拼单, dining=聚餐投票, meal=约饭）
    if (mode === 'group') {
      whereClause.mode = 'group';
    } else if (mode === 'dining') {
      whereClause.mode = 'a';
    } else if (mode === 'meal') {
      whereClause.mode = 'b';
    }

    let query = db.collection('rooms').where(whereClause);

    // 获取当前用户创建的所有房间（限制数量避免超时）
    const { data: rooms } = await query.orderBy('createdAt', 'desc').limit(20).get();

    if (!rooms || rooms.length === 0) {
      return {
        code: 0,
        data: [],
        msg: '获取成功'
      };
    }

    // 获取所有房间ID
    const roomIds = rooms.map(room => room.roomId);
    
    // 批量获取参与者信息和数量
    let participantCounts = {};
    let participantAvatars = {}; // 存储每个房间的参与者头像
    try {
      const { data: participants } = await db.collection('room_participants')
        .where({
          roomId: _.in(roomIds)
        })
        .field({ roomId: true, openid: true })
        .get();
      
      // 统计每个房间的参与者数量
      participants.forEach(p => {
        participantCounts[p.roomId] = (participantCounts[p.roomId] || 0) + 1;
      });

      // 获取所有参与者的 openid
      const participantOpenIds = [...new Set(participants.map(p => p.openid))];
      
      // 批量获取参与者用户信息（头像）
      if (participantOpenIds.length > 0) {
        const { data: participantUsers } = await db.collection('users')
          .where({
            _openid: _.in(participantOpenIds)
          })
          .field({ _openid: true, avatarUrl: true })
          .get();
        
        // 建立 openId 到 avatarUrl 的映射，并转换 cloud:// 格式
        const userAvatarMap = {};
        const avatarUrlsToConvert = [];
        
        participantUsers.forEach(u => {
          let avatarUrl = u.avatarUrl || '';
          if (avatarUrl && avatarUrl.startsWith('cloud://')) {
            avatarUrlsToConvert.push(avatarUrl);
          }
          userAvatarMap[u._openid] = avatarUrl;
        });
        
        // 批量转换 cloud:// 格式为临时 URL
        if (avatarUrlsToConvert.length > 0) {
          try {
            const tempRes = await cloud.getTempFileURL({
              fileList: avatarUrlsToConvert
            });
            tempRes.fileList.forEach(item => {
              if (item.tempFileURL) {
                // 找到对应的 openid 并更新
                participantUsers.forEach(u => {
                  if (u.avatarUrl === item.fileID) {
                    userAvatarMap[u._openid] = item.tempFileURL;
                  }
                });
              }
            });
          } catch (err) {
            console.error('获取参与者头像临时URL失败:', err);
          }
        }
        
        // 为每个房间收集参与者头像（排除发起人）
        participants.forEach(p => {
          if (p.openid !== wxContext.OPENID) { // 排除发起人自己
            if (!participantAvatars[p.roomId]) {
              participantAvatars[p.roomId] = [];
            }
            const avatarUrl = userAvatarMap[p.openid];
            if (avatarUrl && !participantAvatars[p.roomId].includes(avatarUrl)) {
              participantAvatars[p.roomId].push(avatarUrl);
            }
          }
        });
      }
    } catch (err) {
      console.error('获取参与者信息失败:', err);
    }

    // 获取当前用户信息
    let creatorInfo = { nickName: '', avatarUrl: '' };
    try {
      console.log('查询用户信息, OPENID:', wxContext.OPENID);
      const { data: users } = await db.collection('users')
        .where({ _openid: wxContext.OPENID })
        .limit(1)
        .get();
      console.log('查询到的用户:', users);
      if (users && users.length > 0) {
        let avatarUrl = users[0].avatarUrl || '';
        
        // 如果是 cloud:// 格式，转换为临时 URL
        if (avatarUrl && avatarUrl.startsWith('cloud://')) {
          try {
            const tempRes = await cloud.getTempFileURL({
              fileList: [avatarUrl]
            });
            if (tempRes.fileList && tempRes.fileList[0] && tempRes.fileList[0].tempFileURL) {
              avatarUrl = tempRes.fileList[0].tempFileURL;
            }
          } catch (err) {
            console.error('获取头像临时URL失败:', err);
          }
        }
        
        creatorInfo = {
          nickName: users[0].nickName || '',
          avatarUrl: avatarUrl
        };
        console.log('creatorInfo:', creatorInfo);
      } else {
        console.log('未找到用户记录');
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }

    // 组装返回数据
    const roomsWithParticipants = rooms.map(room => {
      // 处理 location 字段，可能是对象或字符串
      let locationStr = '';
      if (room.location) {
        if (typeof room.location === 'string') {
          locationStr = room.location;
        } else if (typeof room.location === 'object') {
          // 如果是对象，尝试提取名称和地址
          locationStr = room.location.name || room.location.address || JSON.stringify(room.location);
        }
      }
      
      // 格式化 voteDeadline
      let voteDeadlineStr = '';
      if (room.voteDeadline) {
        const date = new Date(room.voteDeadline);
        if (!isNaN(date.getTime())) {
          const month = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
          const day = (date.getDate() < 10 ? '0' : '') + date.getDate();
          const hour = (date.getHours() < 10 ? '0' : '') + date.getHours();
          const minute = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
          voteDeadlineStr = `${month}-${day} ${hour}:${minute}`;
        }
      }
      
      return {
        roomId: room.roomId,
        title: room.title,
        status: room.status,
        mode: room.mode,
        activityDate: room.activityDate || '',
        activityTime: room.activityTime || '',
        location: locationStr,
        shopName: room.shopName,
        shopImage: room.shopImage,
        platform: room.platform,
        minAmount: room.minAmount,
        deadline: room.deadline,
        createdAt: room.createdAt,
        voteDeadline: room.voteDeadline,
        voteDeadlineStr: voteDeadlineStr,
        finalPoster: room.finalPoster,
        candidatePosters: room.candidatePosters || [],
        participantCount: participantCounts[room.roomId] || 0,
        creatorNickName: creatorInfo.nickName,
        creatorAvatarUrl: creatorInfo.avatarUrl,
        participantAvatars: participantAvatars[room.roomId] || []
      };
    });

    return {
      code: 0,
      data: roomsWithParticipants,
      msg: '获取成功'
    };
  } catch (err) {
    console.error('getMyRooms error:', err);
    return {
      code: -1,
      msg: err.message || '获取失败',
      data: []
    };
  }
};
