const cloud = require('wx-server-sdk'); cloud.init();
const db = cloud.database();
const _ = db.command;
exports.main = async (event) => {
  const { roomId } = event;
  try {
    const { data: room } = await db.collection('rooms').doc(roomId).get();
    const total = (room.candidatePosters || []).length;
    const { data: participants } = await db.collection('participants').where({ roomId, status: _.in(['voted', 'leave']) }).get();
    const stats = {}; for (let i = 0; i < total; i++) stats[i] = { likes: 0, vetoes: 0, vetoReasons: [] };
    participants.forEach(p => {
      if (!p.vote) return;
      (p.vote.posterIndices || []).forEach(i => { if (stats[i]) stats[i].likes++; });
      (p.vote.vetoIndices || []).forEach(i => { if (stats[i]) { stats[i].vetoes++; stats[i].vetoReasons.push(...(p.hardTaboos || []).slice(0, 3)); } });
    });
    const valid = [], vetoed = [];
    Object.entries(stats).forEach(([idx, s]) => {
      const i = parseInt(idx), poster = room.candidatePosters[i];
      if (!poster) return;
      const item = { index: i, imageUrl: poster.imageUrl, platformSource: poster.platformSource, likes: s.likes, vetoes: s.vetoes };
      if (s.vetoes > 0) { item.vetoReasons = [...new Set(s.vetoReasons)].map(n => ({ spicy:'忌辣', seafood:'忌海鲜', lamb:'忌羊肉', beef:'忌牛肉', pork:'忌猪肉', organs:'忌内脏', fish:'忌鱼', raw:'忌生冷', sweet:'忌甜口', vegetarian:'素食', no_tea:'忌茶底', no_lactose:'忌乳糖', no_pearl:'忌珍珠' }[n] || n)); vetoed.push(item); }
      else valid.push(item);
    });
    valid.sort((a, b) => b.likes - a.likes);
    const hardMinefields = [];
    const htc = {};
    participants.forEach(p => (p.hardTaboos || []).forEach(n => htc[n] = (htc[n] || 0) + 1));
    Object.entries(htc).forEach(([n, c]) => { const map = { spicy:'辣', seafood:'海鲜', lamb:'羊肉', beef:'牛肉', pork:'猪肉', organs:'内脏', fish:'鱼', raw:'生冷', sweet:'甜口', vegetarian:'素食', no_tea:'无茶底', no_lactose:'无乳糖', no_pearl:'无珍珠' }; if (c > 0) hardMinefields.push({ name: n, label: map[n] || n, count: c }); });
    hardMinefields.sort((a, b) => b.count - a.count);
    return { code: 0, data: { validPosters: valid, vetoedPosters: vetoed, isTie: valid.length >= 2 && valid[0].likes === valid[1].likes, winner: valid[0] || null, hardMinefields, stats: { total: participants.length, voted: participants.filter(p => p.status === 'voted').length, leave: participants.filter(p => p.status === 'leave').length, unvoted: 0 } } };
  } catch(e) { return { code: -1, msg: e.message }; }
};