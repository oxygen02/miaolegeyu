const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { voteId, title, description, candidateDates, timeRange, timePeriod, minParticipants, deadline, anonymous } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  if (!voteId) {
    return { success: false, error: '缺少投票ID' };
  }

  try {
    // 先查询投票是否存在且是当前用户创建的
    const { data: votes } = await db.collection('schedule_votes')
      .where({ _id: voteId })
      .limit(1)
      .get();

    if (!votes || votes.length === 0) {
      return { success: false, error: '投票不存在' };
    }

    const vote = votes[0];
    
    // 检查是否是创建者
    if (vote.creatorOpenId !== OPENID) {
      return { success: false, error: '只有创建者可以编辑' };
    }

    // 检查投票是否已截止
    const now = new Date();
    const voteDeadline = new Date(vote.deadline);
    if (now > voteDeadline) {
      return { success: false, error: '投票已截止，无法编辑' };
    }

    // 构建更新数据
    const updateData = {
      updatedAt: db.serverDate()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || '';
    if (candidateDates !== undefined) updateData.candidateDates = candidateDates;
    if (timeRange !== undefined) updateData.timeRange = timeRange;
    if (timePeriod !== undefined) updateData.timePeriod = timePeriod;
    if (minParticipants !== undefined) updateData.minParticipants = minParticipants || 2;
    if (deadline !== undefined) updateData.deadline = new Date(deadline);
    if (anonymous !== undefined) updateData.anonymous = anonymous;

    // 如果更新了候选日期，重新生成时间段
    if (candidateDates && timeRange && timePeriod) {
      const generateTimeSlots = (dates, range, period) => {
        const slots = [];
        let periodRange = '12:00-14:00';
        if (range && typeof range === 'object' && range[period]) {
          periodRange = range[period];
        }
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
            currentMin += 30;
          }
        });
        return slots;
      };

      updateData.allSlots = generateTimeSlots(candidateDates, timeRange, timePeriod);
    }

    // 执行更新
    await db.collection('schedule_votes').doc(voteId).update({
      data: updateData
    });

    return {
      success: true,
      message: '更新成功'
    };
  } catch (err) {
    console.error('updateScheduleVote error:', err);
    return { success: false, error: err.message };
  }
};
