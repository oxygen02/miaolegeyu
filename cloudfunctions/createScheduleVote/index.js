const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { title, description, candidateDates, timeRange, timePeriod, minParticipants, deadline, anonymous } = event;

  try {
    // 根据时段生成所有候选时间段
    const generateTimeSlots = (dates, range, period) => {
      const slots = [];
      let periodRange = '12:00-14:00';
      if (range && typeof range === 'object' && range[period]) {
        periodRange = range[period];
      }
      // 防御：确保格式正确
      if (!periodRange || typeof periodRange !== 'string' || !periodRange.includes('-')) {
        periodRange = '12:00-14:00';
      }
      const rangeParts = periodRange.split('-');
      if (rangeParts.length !== 2) {
        return slots;
      }
      const [rangeStart, rangeEnd] = rangeParts;
      if (!rangeStart || !rangeEnd || !rangeStart.includes(':') || !rangeEnd.includes(':')) {
        return slots;
      }
      const [startHour, startMin] = rangeStart.split(':').map(Number);
      const [endHour, endMin] = rangeEnd.split(':').map(Number);

      dates.forEach(date => {
        let currentMin = startHour * 60 + startMin;
        const endMinTotal = endHour * 60 + endMin;

        while (currentMin < endMinTotal) {
          const h = Math.floor(currentMin / 60);
          const m = currentMin % 60;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          slots.push({
            date,
            time: timeStr,
            key: `${date}_${timeStr}`
          });
          currentMin += 30; // 每30分钟一个点
        }
      });
      return slots;
    };

    const allSlots = generateTimeSlots(candidateDates, timeRange, timePeriod);

    const result = await db.collection('schedule_votes').add({
      data: {
        title,
        description: description || '',
        creatorOpenId: OPENID,
        candidateDates,
        timeRange,
        timePeriod,
        minParticipants: minParticipants || 2,
        deadline: new Date(deadline),
        anonymous: anonymous !== false, // 默认匿名
        status: 'voting', // voting / closed / confirmed
        allSlots,
        participants: [],
        votes: [], // 对推荐时段的投票
        confirmedSlot: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      voteId: result._id
    };
  } catch (err) {
    console.error('createScheduleVote error:', err);
    return { success: false, error: err.message };
  }
};
