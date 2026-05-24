const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 敏感词库
const SENSITIVE_WORDS = [
  // 政治敏感词
  '反动', '暴乱', '革命', '独裁', '专政', '颠覆', '政变', '游行', '示威',
  // 色情词汇
  '色情', '淫秽', '卖淫', '嫖娼', '裸聊', '性服务', '援交', '约炮', '一夜情',
  // 暴力词汇
  '杀人', '放火', '爆炸', '恐怖', '暴力', '枪支', '弹药', '炸弹', '刀具',
  // 诈骗词汇
  '诈骗', '传销', '洗钱', '赌博', '博彩', '赌球', '赌马', '六合彩',
  // 毒品相关
  '毒品', '吸毒', '贩毒', '违禁', '非法', '大麻', '冰毒', '海洛因', '可卡因',
  // 自残/自杀相关
  '自杀', '自残', '割腕', '跳楼', '上吊', '服毒', '轻生', '寻死',
  // 其他违规
  '翻墙', 'VPN', '代理', '黑客', '盗号', '木马', '病毒', '勒索'
];

function containsSensitive(text) {
  if (!text) return false;
  for (const word of SENSITIVE_WORDS) {
    if (text.includes(word)) return true;
  }
  return false;
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  
  // 仅管理员可执行
  if (!wxContext.OPENID) {
    return { code: -1, msg: '未登录' };
  }
  
  let totalChecked = 0;
  let totalDeleted = 0;
  const deletedDetails = [];
  
  try {
    // ===== 清理 rooms 集合 =====
    const roomsRes = await db.collection('rooms').limit(1000).get();
    const rooms = roomsRes.data;
    
    for (const room of rooms) {
      totalChecked++;
      const textToCheck = [room.title, room.location, room.shopName].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck)) {
        await db.collection('rooms').doc(room._id).remove();
        await db.collection('room_participants').where({ roomId: room.roomId }).remove();
        totalDeleted++;
        deletedDetails.push({ collection: 'rooms', id: room.roomId, title: room.title });
        console.log(`删除违规房间: ${room.roomId}, 标题: ${room.title}`);
      }
    }
    
    // ===== 清理 dining_appointments 集合 =====
    const diningRes = await db.collection('dining_appointments').limit(1000).get();
    const diningAppointments = diningRes.data;
    
    for (const apt of diningAppointments) {
      totalChecked++;
      const textToCheck = [apt.shopName, apt.initiatorName, apt.note].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck)) {
        await db.collection('dining_appointments').doc(apt._id).remove();
        totalDeleted++;
        deletedDetails.push({ collection: 'dining_appointments', id: apt._id, title: apt.shopName });
        console.log(`删除违规约饭: ${apt._id}, 店铺: ${apt.shopName}`);
      }
    }
    
    // ===== 清理 schedule_votes 集合 =====
    const votesRes = await db.collection('schedule_votes').limit(1000).get();
    const votes = votesRes.data;
    
    for (const vote of votes) {
      totalChecked++;
      const textToCheck = [vote.title, vote.location, vote.description].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck)) {
        await db.collection('schedule_votes').doc(vote._id).remove();
        totalDeleted++;
        deletedDetails.push({ collection: 'schedule_votes', id: vote._id, title: vote.title });
        console.log(`删除违规投票: ${vote._id}, 标题: ${vote.title}`);
      }
    }
    
    return {
      code: 0,
      data: { 
        checkedCount: totalChecked, 
        deletedCount: totalDeleted,
        deletedDetails: deletedDetails.slice(0, 20) // 最多返回20条详情
      },
      msg: `检查完成，共检查${totalChecked}条记录，删除${totalDeleted}条违规记录`
    };
    
  } catch (err) {
    console.error('清理失败:', err);
    return { code: -1, msg: '清理失败: ' + err.message };
  }
};
