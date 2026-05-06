const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 检查用户选择的时间是否与已有活动冲突
 * @param {string[]} dates - 用户选择的日期列表 ['2026-05-08', '2026-05-09']
 * @param {string} excludeVoteId - 排除当前投票ID（避免与自己冲突）
 * @param {string} excludeRoomId - 排除当前房间ID
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { dates, excludeVoteId, excludeRoomId } = event;

  if (!dates || dates.length === 0) {
    return { success: true, conflicts: [] };
  }

  try {
    const conflicts = [];

    // ========== 1. 检查已确定的聚餐活动 (rooms) ==========
    // 获取用户参与的所有房间
    const { data: participants } = await db.collection('room_participants')
      .where({
        openid: OPENID,
        role: _.in(['participant', 'creator'])
      })
      .get();

    const roomIds = participants.map(p => p.roomId);

    if (roomIds.length > 0) {
      // 获取有确定时间的房间（activityDate 不为空）
      const { data: rooms } = await db.collection('rooms')
        .where({
          roomId: _.in(roomIds),
          activityDate: _.nin(['', null]),
          status: _.in(['locked', 'completed', 'voting'])
        })
        .get();

      rooms.forEach(room => {
        if (excludeRoomId && room.roomId === excludeRoomId) return;

        const roomDate = room.activityDate;
        if (dates.includes(roomDate)) {
          conflicts.push({
            type: 'room',
            id: room.roomId,
            title: room.title || '未命名聚餐',
            date: roomDate,
            time: room.activityTime || '',
            location: room.location || '',
            status: room.status,
            isCreator: room.creatorOpenId === OPENID
          });
        }
      });
    }

    // ========== 2. 检查其他时间投票 (schedule_votes) ==========
    // 获取用户参与的其他时间投票
    const { data: votes } = await db.collection('schedule_votes')
      .where({
        _id: excludeVoteId ? _.neq(excludeVoteId) : _.neq(''),
        'participants.openId': OPENID,
        status: 'voting'
      })
      .get();

    votes.forEach(vote => {
      const myParticipation = vote.participants?.find(p => p.openId === OPENID);
      if (!myParticipation) return;

      // 获取该投票中用户标记为可用的日期
      const availableDates = [];

      if (myParticipation.matrix && typeof myParticipation.matrix === 'object') {
        Object.keys(myParticipation.matrix).forEach(date => {
          const level = Number(myParticipation.matrix[date]);
          if (level >= 1) availableDates.push(date);
        });
      } else if (myParticipation.availability && typeof myParticipation.availability === 'object') {
        Object.keys(myParticipation.availability).forEach(date => {
          if (myParticipation.availability[date] && myParticipation.availability[date].length > 0) {
            availableDates.push(date);
          }
        });
      }

      // 检查候选日期是否冲突
      const conflictDates = vote.candidateDates?.filter(d => dates.includes(d)) || [];
      if (conflictDates.length > 0) {
        conflicts.push({
          type: 'schedule_vote',
          id: vote._id,
          title: vote.title || '时间投票',
          date: conflictDates.join('、'),
          time: vote.timePeriod === 'lunch' ? '中午' : '晚上',
          status: vote.status,
          isCreator: vote.creatorOpenId === OPENID
        });
      }
    });

    // ========== 3. 检查用户发起的投票 ==========
    const { data: myVotes } = await db.collection('schedule_votes')
      .where({
        _id: excludeVoteId ? _.neq(excludeVoteId) : _.neq(''),
        creatorOpenId: OPENID,
        status: 'voting'
      })
      .get();

    myVotes.forEach(vote => {
      const conflictDates = vote.candidateDates?.filter(d => dates.includes(d)) || [];
      if (conflictDates.length > 0) {
        // 避免重复添加
        const alreadyAdded = conflicts.some(c => c.type === 'schedule_vote' && c.id === vote._id);
        if (!alreadyAdded) {
          conflicts.push({
            type: 'schedule_vote_created',
            id: vote._id,
            title: vote.title || '时间投票',
            date: conflictDates.join('、'),
            time: vote.timePeriod === 'lunch' ? '中午' : '晚上',
            status: vote.status,
            isCreator: true
          });
        }
      }
    });

    return {
      success: true,
      conflicts
    };

  } catch (err) {
    console.error('checkScheduleConflict error:', err);
    return { success: false, error: err.message, conflicts: [] };
  }
};
