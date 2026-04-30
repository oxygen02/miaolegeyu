const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const { roomId, title, location, peopleCount, activityDate, activityTime, candidatePosters, voteDeadline, timeAuxiliary, enableRestaurantRecommend, dinnerTime, paymentMode, isAnonymous } = event;
  
  if (!roomId) {
    return { code: -1, msg: '房间ID不能为空' };
  }
  
  try {
    // 检查是否是创建者
    const roomResult = await db.collection('rooms')
      .where({
        roomId: roomId,
        creatorOpenId: wxContext.OPENID
      })
      .get();
    
    if (roomResult.data.length === 0) {
      return { code: -1, msg: '无权编辑此活动' };
    }
    
    const room = roomResult.data[0];
    
    // 检查是否已截止
    if (room.voteDeadline) {
      const deadline = new Date(room.voteDeadline);
      const now = new Date();
      if (deadline < now) {
        return { code: -1, msg: '投票已截止，无法编辑' };
      }
    }
    
    // 更新房间数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (location !== undefined) updateData.location = location;
    if (peopleCount !== undefined) updateData.peopleCount = peopleCount;
    if (activityDate !== undefined) updateData.activityDate = activityDate;
    if (activityTime !== undefined) updateData.activityTime = activityTime;
    if (candidatePosters !== undefined) updateData.candidatePosters = candidatePosters;
    if (voteDeadline !== undefined) updateData.voteDeadline = voteDeadline;
    if (timeAuxiliary !== undefined) updateData.timeAuxiliary = timeAuxiliary;
    if (enableRestaurantRecommend !== undefined) updateData.enableRestaurantRecommend = enableRestaurantRecommend;
    if (dinnerTime !== undefined) updateData.appointmentDate = new Date(dinnerTime);
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (isAnonymous !== undefined) updateData.isAnonymous = isAnonymous;
    updateData.updatedAt = db.serverDate();
    
    await db.collection('rooms')
      .where({ roomId })
      .update({ data: updateData });
    
    return {
      code: 0,
      msg: '更新成功',
      success: true
    };
  } catch (err) {
    console.error('updateRoom error:', err);
    return { code: -1, msg: err.message || '更新失败' };
  }
};
