const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, nickName = '', avatarUrl = '', password = '', shareFrom = '' } = event;

  // 1. 校验登录态
  if (!wxContext.OPENID) {
    return { code: -1, msg: '用户未登录' };
  }

  // 2. 参数校验
  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }

  try {
    // 使用事务确保数据一致性
    const transaction = await db.startTransaction();

    try {
      // 3. 检查房间是否存在
      const roomResult = await transaction.collection('rooms').where({ roomId }).get();
      if (roomResult.data.length === 0) {
        await transaction.rollback();
        return { code: -1, msg: '房间不存在或已删除' };
      }

      const room = roomResult.data[0];

      // 4. 检查房间状态（包括是否已过期）
      const now = new Date();
      let effectiveStatus = room.status || 'voting';
      if (effectiveStatus === 'voting' && (room.deadline || room.voteDeadline)) {
        const deadlineDate = new Date(room.deadline || room.voteDeadline);
        if (!isNaN(deadlineDate.getTime()) && deadlineDate <= now) {
          effectiveStatus = 'ended';
        }
      }
      if (effectiveStatus !== 'voting') {
        await transaction.rollback();
        return { code: -1, msg: '房间已结束或已锁定，无法加入' };
      }

      // 5. 可见性校验：检查用户是否有权限加入该房间
      const isCreator = room.creatorOpenId === wxContext.OPENID;
      if (!isCreator) {
        const visibility = room.visibility || 'friends';

        // "仅通过分享"的活动：检查是否通过分享链访问
        if (visibility === 'share') {
          // 如果是通过分享链接加入的（shareFrom 参数），允许加入
          // 否则拒绝
          if (!shareFrom) {
            await transaction.rollback();
            return { code: 403, msg: '该活动仅通过分享链接加入' };
          }
        }

        // "仅好友可见"的活动：检查是否是好友
        // 兼容旧数据：creatorOpenId为空时跳过好友检查（发起人退出后重新加入场景）
        if (visibility === 'friends' && room.creatorOpenId) {
          let isFriend = false;
          try {
            // 查询当前用户的好友列表
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
            await transaction.rollback();
            return { code: 403, msg: '该活动仅好友可加入' };
          }
        }
        // "公开"活动或creatorOpenId为空的旧数据：允许加入
      }

      // 6. 验证密码（如果房间设置了密码）
      if (room.needPassword && room.roomPassword) {
        if (!password) {
          await transaction.rollback();
          return { code: -1, msg: '该房间需要密码' };
        }
        // 对输入的密码进行md5哈希后比较
        const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
        if (hashedPassword !== room.roomPassword) {
          await transaction.rollback();
          return { code: -1, msg: '密码错误' };
        }
      }

      // 7. 检查房间是否已满员
      const participantResult = await transaction.collection('room_participants')
        .where({ roomId })
        .get();

      const maxCount = room.peopleCount || 50; // 默认最大50人
      if (participantResult.data.length >= maxCount) {
        await transaction.rollback();
        return { code: -1, msg: '房间已满员' };
      }

      // 8. 检查用户是否已在房间内（防止重复加入）
      const existingParticipant = participantResult.data.find(
        p => p.openid === wxContext.OPENID
      );

      if (existingParticipant) {
        await transaction.rollback();
        return { code: -1, msg: '您已在该房间中' };
      }
      
      // 9. 原子操作：添加参与者记录
      await transaction.collection('room_participants').add({
        data: {
          roomId,
          openid: wxContext.OPENID,
          role: 'participant',
          status: 'joined',
          nickName: nickName || '',
          avatarUrl: avatarUrl || '',
          vote: null,
          joinedAt: db.serverDate()
        }
      });
      
      // 10. 原子操作：增加房间参与人数
      await transaction.collection('rooms').doc(room._id).update({
        data: {
          participantCount: _.inc(1),
          updatedAt: db.serverDate()
        }
      });
      
      // 提交事务
      await transaction.commit();

      // 异步记录分享入口（通过谁的分享链接加入的，不阻塞主流程）
      if (shareFrom && shareFrom !== wxContext.OPENID) {
        db.collection('share_records').add({
          data: {
            roomId,
            sharerOpenId: shareFrom,        // 分享人
            joinerOpenId: wxContext.OPENID,   // 通过分享链接加入的人
            shareType: 'entry',               // 类型：通过分享链接进入并加入
            source: 'share_link',             // 来源：分享卡片打开
            createTime: db.serverDate()
          }
        }).catch(err => {
          console.warn('[joinRoom] 记录分享入口失败（不影响主流程）:', err);
        });
      }
      
      return {
        code: 0,
        msg: '加入成功',
        data: {
          roomId,
          roomTitle: room.title,
          mode: room.mode,
          status: room.status
        }
      };
      
    } catch (err) {
      // 回滚事务
      await transaction.rollback();
      throw err;
    }
    
  } catch (err) {
    console.error('joinRoom error:', err);
    return {
      code: -1,
      msg: err.message || '加入失败'
    };
  }
};
