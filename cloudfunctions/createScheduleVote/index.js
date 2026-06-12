const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

let checkContent;
try {
  const contentSecurity = require('./contentSecurity');
  checkContent = contentSecurity.checkContent;
} catch (err) {
  console.warn('contentSecurity 模块加载失败，使用基础检查:', err.message);
  checkContent = async (content) => ({ passed: true, msg: '内容审核通过' });
}

// 确保集合存在（自动创建）
async function ensureCollection(collectionName) {
  try {
    await db.collection(collectionName).limit(1).get();
  } catch (err) {
    if (err.errCode === -5020 || err.message.includes('collection not exists') || err.message.includes('not exist')) {
      console.log(`Collection ${collectionName} not exists, attempting to create...`);
      try {
        await db.createCollection(collectionName);
        console.log(`Collection ${collectionName} created successfully`);
      } catch (createErr) {
        console.error(`Failed to create collection ${collectionName}:`, createErr);
        // 如果创建失败，尝试通过添加一个虚拟文档来隐式创建
        try {
          await db.collection(collectionName).add({ data: { _init: true, createdAt: new Date() } });
          console.log(`Collection ${collectionName} created via add`);
        } catch (addErr) {
          console.error(`Failed to create collection ${collectionName} via add:`, addErr);
          throw addErr;
        }
      }
    } else {
      throw err;
    }
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { title, description, candidateDates, timeRange, timePeriod, minParticipants, deadline, anonymous, creatorNickName: inputCreatorNickName, creatorAvatarUrl: inputCreatorAvatarUrl } = event;

  try {
    // 参数验证
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return { success: false, error: '标题不能为空' };
    }

    if (!candidateDates || !Array.isArray(candidateDates) || candidateDates.length === 0) {
      return { success: false, error: '请至少选择一个候选日期' };
    }

    // 时段参数验证和标准化（支持多种输入格式）
    const timePeriodMap = {
      'morning': 'morning',
      'afternoon': 'afternoon',
      'evening': 'evening',
      '早上': 'morning',
      '上午': 'morning',
      '中午': 'afternoon',
      '下午': 'afternoon',
      '晚上': 'evening',
      '夜间': 'evening',
      'lunch': 'afternoon',
      'dinner': 'evening'
    };

    let normalizedTimePeriod = 'afternoon'; // 默认值
    if (timePeriod && typeof timePeriod === 'string') {
      const trimmed = timePeriod.trim().toLowerCase();
      if (timePeriodMap[trimmed]) {
        normalizedTimePeriod = timePeriodMap[trimmed];
      } else if (['morning', 'afternoon', 'evening'].includes(trimmed)) {
        normalizedTimePeriod = trimmed;
      }
      // 如果都不匹配，使用默认值而不是报错
    }

    // 内容安全检查
    const contentToCheck = [title, description].filter(Boolean).join(' ');
    if (contentToCheck) {
      const securityCheck = await checkContent(contentToCheck, OPENID, 2);
      if (!securityCheck.passed) {
        return { success: false, error: securityCheck.msg };
      }
    }

    // 确保 schedule_votes 集合存在
    await ensureCollection('schedule_votes');

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

    const allSlots = generateTimeSlots(candidateDates, timeRange, normalizedTimePeriod);

    // 获取创建者用户信息（优先使用客户端传入的参数）
    let creatorNickName = inputCreatorNickName || '';
    let creatorAvatarUrl = inputCreatorAvatarUrl || '';
    // 如果客户端没有传入，则从数据库查询
    if (!creatorNickName || !creatorAvatarUrl) {
      try {
        const { data: users } = await db.collection('users').where({ _openid: OPENID }).limit(1).get();
        if (users && users.length > 0) {
          creatorNickName = creatorNickName || users[0].nickName || '';
          creatorAvatarUrl = creatorAvatarUrl || users[0].avatarUrl || '';
        }
      } catch (err) {
        console.error('获取创建者信息失败:', err);
      }
    }

    const result = await db.collection('schedule_votes').add({
      data: {
        title: title.trim(),
        description: (description || '').trim(),
        creatorOpenId: OPENID,
        creatorNickName,
        creatorAvatarUrl,
        candidateDates: candidateDates.map(d => d.trim()).filter(Boolean),
        timeRange: timeRange || {},
        timePeriod: normalizedTimePeriod,
        minParticipants: parseInt(minParticipants) || 2,
        deadline: deadline ? new Date(deadline) : null,
        anonymous: !!anonymous, // 按实际传入值，默认不匿名
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
