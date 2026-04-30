// 微信小程序订阅消息模板ID配置
// 已在微信公众平台申请模板

const TEMPLATES = {
  // ==================== 催票提醒模板 ====================
  // 模板类型：投票到期提醒
  // 模板ID：kxexo1yq6plVhrZAB9fzfziVUqIyg4NT9M23adpD7TI
  // 关键词：投票地址、到期时间、备注
  REMIND_VOTE: 'kxexo1yq6plVhrZAB9fzfziVUqIyg4NT9M23adpD7TI',

  // ==================== 报名截止提醒 ====================
  // 模板类型：活动报名截止提醒
  // 关键词：活动名称、截止时间、备注、当前报名人数
  DEADLINE_REMINDER: '',

  // ==================== 活动开始提醒 ====================
  // 模板类型：活动开始提醒
  // 关键词：活动名称、活动时间、活动地点、温馨提示
  ACTIVITY_START: '',

  // ==================== 投票结果通知 ====================
  // 模板类型：投票结果通知
  // 模板ID：8Dh7B_HsiMH6YoHpPnq02fCa3Y6UzgwR19vpHJokM5I
  // 关键词：场次、开场时间、地点、温馨提示、结束时间
  VOTE_RESULT: '8Dh7B_HsiMH6YoHpPnq02fCa3Y6UzgwR19vpHJokM5I',

  // ==================== 房间锁定通知 ====================
  // 模板类型：结果公布
  // 关键词：活动名称、最终结果、公布时间
  ROOM_LOCKED: ''
};

// 模板配置说明
const TEMPLATE_CONFIG = {
  // 催票提醒 - 投票到期提醒
  REMIND_VOTE: {
    name: '投票到期提醒',
    page: '/pages/vote/vote',
    data: {
      thing1: '投票地址',      // 例如：周二晚撸串建设北路
      time2: '到期时间',       // 例如：2024年04月28日 18:00
      thing3: '备注'           // 例如：发起人提醒您尽快投票
    }
  },

  // 报名截止提醒
  DEADLINE_REMINDER: {
    name: '报名截止提醒',
    page: '/pages/room-detail/room-detail',
    data: {
      thing1: '活动名称',
      time2: '截止时间',
      thing3: '备注',
      number4: '当前报名人数'
    }
  },

  // 活动开始提醒
  ACTIVITY_START: {
    name: '活动开始提醒',
    page: '/pages/room-detail/room-detail',
    data: {
      thing1: '活动名称',
      time2: '活动时间',
      thing3: '活动地点',
      thing4: '温馨提示'
    }
  },

  // 投票结果通知
  VOTE_RESULT: {
    name: '投票结果通知',
    page: '/pages/result/result',
    data: {
      thing1: '场次',          // 投票主题
      time2: '开场时间',       // 投票截止时间
      thing3: '地点',          // 获胜选项
      thing4: '温馨提示',      // 支持率信息
      time5: '结束时间'        // 结果锁定时间
    }
  },

  // 房间锁定通知
  ROOM_LOCKED: {
    name: '结果公布',
    page: '/pages/result/result',
    data: {
      thing1: '活动名称',
      thing2: '最终结果',
      time3: '公布时间'
    }
  }
};

module.exports = {
  TEMPLATES,
  TEMPLATE_CONFIG
};
