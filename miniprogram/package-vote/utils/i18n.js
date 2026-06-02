// 页面文本配置（中文）
const CONTROL_TEXTS = {
  statusMap: {
    voting: '投票中',
    locked: '已锁定',
    cancelled: '已取消',
    ended: '已结束'
  },
  toast: {
    copied: '已复制',
    remindSent: '分享链接已复制',
    locked: '已锁定',
    lockFailed: '锁定失败，请重试',
    editExpired: '活动已过期，不可编辑',
    anonymousOn: '已开启匿名投票',
    anonymousOff: '已关闭匿名投票',
    settingFailed: '设置失败',
    shareSuccess: '分享成功'
  },
  modal: {
    lockTitle: '确认锁定',
    lockContent: '锁定后将无法修改投票结果，确定继续？',
    remindTitle: '分享给好友',
    remindContent: '分享链接已复制，快去邀请好友吧！',
    memberVoted: '已完成投票',
    memberUnvoted: '等待投票中'
  },
  loading: {
    locking: '锁定中...'
  }
};

module.exports = {
  CONTROL_TEXTS
};
