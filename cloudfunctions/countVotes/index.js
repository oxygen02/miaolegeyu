const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 引入餐饮分类数据（需要在云函数中复制一份）
const cuisineCategories = [
  {
    id: 'chuanyu',
    name: '川渝',
    subCategories: ['经典川菜', '重庆江湖菜', '水煮干锅菜系', '麻辣家常菜', '自贡盐帮菜']
  },
  {
    id: 'xianggan',
    name: '湘赣',
    subCategories: ['精品湘菜', '江西特色菜', '农家辣味土菜', '特色下饭馆', '风味腊味菜系']
  },
  {
    id: 'yueshi',
    name: '粤式',
    subCategories: ['正统粤菜', '潮汕风味菜', '港式茶餐厅', '广式烧腊', '粤式早茶点心']
  },
  {
    id: 'jiangnan',
    name: '江南',
    subCategories: ['江浙融合菜', '上海本帮菜', '淮扬精致菜', '杭帮家常菜', '江南清淡菜系']
  },
  {
    id: 'beifang',
    name: '北方',
    subCategories: ['东北特色菜', '鲁菜胶东菜', '老北京风味菜', '华北家常菜', '中原豫菜', '铁锅炖']
  },
  {
    id: 'xibei',
    name: '西北',
    subCategories: ['陕西特色菜', '新疆风味餐', '甘肃特色风味', '内蒙蒙餐', '西北清真硬菜']
  },
  {
    id: 'yungui',
    name: '云贵',
    subCategories: ['云南滇菜', '贵州酸汤菜', '广西特色菜', '傣味特色料理', '山野风味菜系']
  },
  {
    id: 'huazhong',
    name: '华中',
    subCategories: ['湖北鄂菜', '闽南特色菜', '徽菜皖味', '客家私房菜', '海南琼菜']
  },
  {
    id: 'huoguo',
    name: '火锅',
    subCategories: ['川渝牛油火锅', '潮汕牛肉火锅', '老北京铜锅', '羊蝎子汤锅', '猪肚鸡煲锅', '鱼蛙主题火锅', '清汤养生火锅']
  },
  {
    id: 'chuanchuan',
    name: '串串',
    subCategories: ['冷热串串', '麻辣香锅', '干锅系列菜品', '钵钵鸡冷串', '围炉涮串串']
  },
  {
    id: 'shaokao',
    name: '烧烤烤肉',
    subCategories: ['中式传统烤串', '韩式炭火烤肉', '日式精致烧肉', '铁板烧料理', '烤羊排烤全羊', '东北烤肉']
  },
  {
    id: 'longxia',
    name: '小龙虾',
    subCategories: ['麻辣小龙虾', '炭火特色烤鱼', '香辣蟹大餐', '花甲田螺排档', '纸包鱼专项']
  },
  {
    id: 'riliao',
    name: '日料',
    subCategories: ['寿司刺身料理', '日式居酒屋', '日式炭火烧肉', '日式定食正餐', '日式寿喜烧']
  },
  {
    id: 'hanliao',
    name: '韩料',
    subCategories: ['韩式正餐料理', '韩式烤肉', '韩式部队火锅', '韩式特色汤锅', '韩餐硬核硬菜']
  },
  {
    id: 'dongnanya',
    name: '东南亚',
    subCategories: ['泰国菜系', '越南料理', '新加坡风味', '马来西亚菜系', '东南亚融合菜']
  },
  {
    id: 'xishi',
    name: '西式',
    subCategories: ['经典牛排西餐', '意大利正餐', '法式精致料理', '德式传统西餐', '俄式经典正餐']
  },
  {
    id: 'haixian',
    name: '海鲜',
    subCategories: ['蒸汽海鲜', '海鲜大排档', '高端海鲜酒楼', '海鲜特色小炒', '生蚝龙虾专项']
  },
  {
    id: 'zizhu',
    name: '自助',
    subCategories: ['经典火锅自助', '炭火烤肉自助', '豪华海鲜自助', '综合全能自助', '高端料理自助']
  },
  {
    id: 'nongjia',
    name: '农家',
    subCategories: ['乡村土菜馆', '农家大院菜', '山野家常菜', '田园特色菜', '柴火灶炖菜']
  },
  {
    id: 'sifang',
    name: '私房',
    subCategories: ['高端私房菜', '无国界融合菜', '创意意境菜', '小众特色私厨', '精致宴席菜']
  }
];

exports.main = async (event) => {
  const { roomId } = event;
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;

  // 1. 校验登录态
  if (!OPENID) {
    return {
      code: -1,
      msg: '用户未登录'
    };
  }

  // 2. 参数校验
  if (!roomId) {
    return {
      code: -1,
      msg: '房间ID不能为空'
    };
  }

  try {
    // 3. 获取房间信息并校验权限
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

    // 4. 权限校验：检查用户是否是房间参与者或创建者
    const isCreator = room.creatorOpenId === OPENID;

    // 检查是否是参与者
    const participantResult = await db.collection('room_participants')
      .where({
        roomId,
        openid: OPENID
      })
      .limit(1)
      .get();

    const isParticipant = participantResult.data && participantResult.data.length > 0;

    // 如果不是创建者也不是参与者，拒绝访问
    if (!isCreator && !isParticipant) {
      return {
        code: 403,
        msg: '无权查看此房间的投票统计'
      };
    }

    // 5. 获取所有已投票的参与者
    const { data: participants } = await db.collection('room_participants')
      .where({ roomId, status: 'voted' })
      .get();

    // 根据房间模式选择不同的统计方式
    if (room.mode === 'b') {
      // Mode B: 两轮选择（大类+细类）统计
      return countModeBVotes(participants, room, cuisineCategories);
    } else {
      // Mode A: 海报投票统计
      return countModeAVotes(participants, room);
    }
  } catch (err) {
    console.error('countVotes error:', err);
    return {
      code: -1,
      msg: '统计失败，请重试'
    };
  }
};

/**
 * Mode A: 海报投票统计
 */
function countModeAVotes(participants, room) {
  const posterStats = {}; // { 0: { likes: 0, vetoes: 0 }, ... }
  const hardTabooStats = {}; // 硬性禁忌统计
  const softTabooStats = {}; // 软性偏好统计

  participants.forEach(p => {
    const vote = p.vote || {};

    // 统计赞成票
    (vote.posterIndices || []).forEach(idx => {
      if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
      posterStats[idx].likes++;
    });

    // 统计否决票（硬性禁忌）
    (vote.vetoIndices || []).forEach(idx => {
      if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
      posterStats[idx].vetoes++;
    });

    // 统计禁忌
    (vote.hardTaboos || []).forEach(taboo => {
      hardTabooStats[taboo] = (hardTabooStats[taboo] || 0) + 1;
    });

    (vote.softTaboos || []).forEach(taboo => {
      softTabooStats[taboo] = (softTabooStats[taboo] || 0) + 1;
    });
  });

  // 过滤: vetoes > 0 的海报不参与排序（一票否决）
  const validPosters = Object.entries(posterStats)
    .filter(([idx, stat]) => stat.vetoes === 0)
    .sort((a, b) => b[1].likes - a[1].likes)
    .map(([idx, stat]) => ({
      index: parseInt(idx),
      likes: stat.likes,
      vetoes: stat.vetoes
    }));

  // 被否决的海报
  const vetoedPosters = Object.entries(posterStats)
    .filter(([idx, stat]) => stat.vetoes > 0)
    .map(([idx, stat]) => ({
      index: parseInt(idx),
      likes: stat.likes,
      vetoes: stat.vetoes
    }));

  return {
    code: 0,
    data: {
      mode: 'a',
      totalVoters: participants.length,
      validPosters,
      vetoedPosters,
      hardTabooStats,
      softTabooStats,
      candidatePosters: room.candidatePosters || []
    },
    msg: '统计成功'
  };
}

/**
 * Mode B: 两轮选择（大类+细类）统计
 */
function countModeBVotes(participants, room, cuisineCategories) {
  // 1. 统计大类选择情况
  const categoryStats = {}; // { categoryId: { count: 0, name: '', subCategories: {} } }
  const hardTabooStats = {};
  const totalVoters = participants.length;

  participants.forEach(p => {
    const vote = p.vote || {};
    const preferences = vote.cuisinePreferences || [];

    // 统计大类选择
    preferences.forEach(pref => {
      const catId = pref.categoryId;
      if (!catId) return;

      if (!categoryStats[catId]) {
        const catInfo = cuisineCategories.find(c => c.id === catId);
        categoryStats[catId] = {
          id: catId,
          name: pref.categoryName || (catInfo ? catInfo.name : catId),
          count: 0,
          subCategories: {}
        };
      }
      categoryStats[catId].count++;

      // 统计细类选择
      (pref.subCategories || []).forEach(subName => {
        if (!categoryStats[catId].subCategories[subName]) {
          categoryStats[catId].subCategories[subName] = {
            name: subName,
            count: 0,
            voters: []
          };
        }
        categoryStats[catId].subCategories[subName].count++;
        categoryStats[catId].subCategories[subName].voters.push(p.openid);
      });
    });

    // 统计禁忌
    (vote.hardTaboos || []).forEach(taboo => {
      hardTabooStats[taboo] = (hardTabooStats[taboo] || 0) + 1;
    });
  });

  // 2. 计算匹配结果
  const matchResults = [];

  Object.values(categoryStats).forEach(catStat => {
    const subCats = Object.values(catStat.subCategories);

    // 按选择人数排序
    subCats.sort((a, b) => b.count - a.count);

    // 计算匹配度
    const perfectMatch = subCats.filter(s => s.count === totalVoters); // 所有人都选
    const partialMatch = subCats.filter(s => s.count < totalVoters && s.count > 1); // 部分人选（至少2人）
    const singleMatch = subCats.filter(s => s.count === 1); // 只有1人选

    matchResults.push({
      categoryId: catStat.id,
      categoryName: catStat.name,
      categoryCount: catStat.count, // 选择该大类的用户数
      perfectMatch: perfectMatch.map(s => ({
        name: s.name,
        count: s.count,
        matchRate: 100
      })),
      partialMatch: partialMatch.map(s => ({
        name: s.name,
        count: s.count,
        matchRate: Math.round((s.count / totalVoters) * 100)
      })),
      singleMatch: singleMatch.map(s => ({
        name: s.name,
        count: s.count,
        matchRate: Math.round((s.count / totalVoters) * 100)
      }))
    });
  });

  // 3. 按大类选择人数排序
  matchResults.sort((a, b) => b.categoryCount - a.categoryCount);

  // 4. 找出最佳匹配（完美匹配优先，其次是匹配度最高的部分匹配）
  const bestMatches = [];
  matchResults.forEach(result => {
    if (result.perfectMatch.length > 0) {
      // 有完美匹配
      result.perfectMatch.forEach(match => {
        bestMatches.push({
          categoryId: result.categoryId,
          categoryName: result.categoryName,
          subCategoryName: match.name,
          matchType: 'perfect',
          matchRate: 100,
          voterCount: match.count
        });
      });
    } else if (result.partialMatch.length > 0) {
      // 取匹配度最高的部分匹配
      const bestPartial = result.partialMatch[0];
      bestMatches.push({
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        subCategoryName: bestPartial.name,
        matchType: 'partial',
        matchRate: bestPartial.matchRate,
        voterCount: bestPartial.count
      });
    }
  });

  // 5. 按匹配度排序最佳匹配
  bestMatches.sort((a, b) => {
    if (a.matchType === 'perfect' && b.matchType !== 'perfect') return -1;
    if (a.matchType !== 'perfect' && b.matchType === 'perfect') return 1;
    return b.matchRate - a.matchRate;
  });

  return {
    code: 0,
    data: {
      mode: 'b',
      totalVoters,
      categoryStats: matchResults,
      bestMatches: bestMatches.slice(0, 5), // 前5个最佳匹配
      hardTabooStats
    },
    msg: '统计成功'
  };
}
