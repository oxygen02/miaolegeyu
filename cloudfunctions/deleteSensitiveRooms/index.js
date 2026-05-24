const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 扩展敏感词库
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
  const { targetRoomId, forceDelete = false } = event;
  
  if (!wxContext.OPENID) {
    return { code: -1, msg: '未登录' };
  }
  
  try {
    let deletedCount = 0;
    let checkedCount = 0;
    const deletedDetails = [];
    
    // ===== 如果指定了 targetRoomId，直接删除该房间 =====
    if (targetRoomId) {
      console.log(`强制删除指定房间: ${targetRoomId}`);
      
      // 在 rooms 集合中查找
      const roomRes = await db.collection('rooms').where({ roomId: targetRoomId }).get();
      if (roomRes.data.length > 0) {
        const room = roomRes.data[0];
        await db.collection('rooms').doc(room._id).remove();
        await db.collection('room_participants').where({ roomId: targetRoomId }).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'rooms', id: targetRoomId, title: room.title, reason: '强制删除' });
        console.log(`已删除房间: ${targetRoomId}`);
      }
      
      // 在 dining_appointments 中查找
      const diningRes = await db.collection('dining_appointments').where({ _id: targetRoomId }).get();
      if (diningRes.data.length > 0) {
        await db.collection('dining_appointments').doc(targetRoomId).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'dining_appointments', id: targetRoomId, title: diningRes.data[0].shopName, reason: '强制删除' });
      }
      
      // 在 schedule_votes 中查找
      const voteRes = await db.collection('schedule_votes').where({ _id: targetRoomId }).get();
      if (voteRes.data.length > 0) {
        await db.collection('schedule_votes').doc(targetRoomId).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'schedule_votes', id: targetRoomId, title: voteRes.data[0].title, reason: '强制删除' });
      }
      
      return {
        code: 0,
        data: { deletedCount, deletedDetails },
        msg: `已删除 ${deletedCount} 个活动`
      };
    }
    
    // ===== 清理 rooms 集合 =====
    const roomsRes = await db.collection('rooms').limit(1000).get();
    const rooms = roomsRes.data;
    
    for (const room of rooms) {
      checkedCount++;
      const textToCheck = [room.title, room.location, room.shopName].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck) || forceDelete) {
        await db.collection('rooms').doc(room._id).remove();
        await db.collection('room_participants').where({ roomId: room.roomId }).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'rooms', id: room.roomId, title: room.title, reason: '敏感词' });
        console.log(`删除违规房间: ${room.roomId}, 标题: ${room.title}`);
      }
    }
    
    // ===== 清理 dining_appointments 集合 =====
    const diningRes = await db.collection('dining_appointments').limit(1000).get();
    const diningAppointments = diningRes.data;
    
    for (const apt of diningAppointments) {
      checkedCount++;
      const textToCheck = [apt.shopName, apt.initiatorName, apt.note].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck)) {
        await db.collection('dining_appointments').doc(apt._id).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'dining_appointments', id: apt._id, title: apt.shopName, reason: '敏感词' });
        console.log(`删除违规约饭: ${apt._id}, 店铺: ${apt.shopName}`);
      }
    }
    
    // ===== 清理 schedule_votes 集合 =====
    const votesRes = await db.collection('schedule_votes').limit(1000).get();
    const votes = votesRes.data;
    
    for (const vote of votes) {
      checkedCount++;
      const textToCheck = [vote.title, vote.location, vote.description].filter(Boolean).join(' ');
      
      if (containsSensitive(textToCheck)) {
        await db.collection('schedule_votes').doc(vote._id).remove();
        deletedCount++;
        deletedDetails.push({ collection: 'schedule_votes', id: vote._id, title: vote.title, reason: '敏感词' });
        console.log(`删除违规投票: ${vote._id}, 标题: ${vote.title}`);
      }
    }
    
    // ===== 特别处理：删除 roomId 为 123456 的房间 =====
    const targetRooms = await db.collection('rooms').where({
      roomId: _.in(['123456', '12345', '1234', '123', '111111', '000000'])
    }).get();
    
    for (const room of targetRooms.data) {
      await db.collection('rooms').doc(room._id).remove();
      await db.collection('room_participants').where({ roomId: room.roomId }).remove();
      deletedCount++;
      deletedDetails.push({ collection: 'rooms', id: room.roomId, title: room.title, reason: '特殊房间号' });
      console.log(`删除特殊房间号: ${room.roomId}, 标题: ${room.title}`);
    }
    
    return {
      code: 0,
      data: { 
        checkedCount, 
        deletedCount,
        deletedDetails: deletedDetails.slice(0, 20)
      },
      msg: `检查完成，共检查${checkedCount}条记录，删除${deletedCount}条违规记录`
    };
    
  } catch (err) {
    console.error('清理失败:', err);
    return { code: -1, msg: '清理失败: ' + err.message };
  }
};
