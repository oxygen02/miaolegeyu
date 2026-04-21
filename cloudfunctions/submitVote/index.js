const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const {
    roomId,
    posterIndices,
    vetoIndices,
    hardTaboos,
    softTaboos,
    timeInfo,
    leaveInfo,
    status
  } = event;

  try {
    // 获取房间
    const roomResult = await db.collection('rooms').doc(roomId).get();
    if (!roomResult.data) {
      return { success: false, error: '房间不存在' };
    }

    const room = roomResult.data;

    // 检查房间状态
    if (room.status !== 'voting') {
      return { success: false, error: '投票已结束' };
    }

    // 查找或创建参与者记录
    let participantResult = await db.collection('participants').where({
      roomId,
      openid
    }).get();

    const voteData = {
      posterIndices: posterIndices || [],
      vetoIndices: vetoIndices || [],
      hardTaboos: hardTaboos || [],
      softTaboos: softTaboos || [],
      timestamp: new Date()
    };

    // 构建更新数据，使用 _.set 确保字段被正确设置
    const updateData = {
      roomId,
      openid,
      uuid: openid,
      status: status || 'voted',
      vote: voteData,
      hardTaboos: hardTaboos || [],
      softTaboos: softTaboos || [],
      updatedAt: db.serverDate()
    };

    // 只有当 timeInfo 不为 null 时才更新该字段
    // 如果 timeInfo 为 null，使用 _.remove() 删除该字段，避免在 null 上创建子字段的错误
    if (timeInfo) {
      updateData.timeInfo = timeInfo;
    } else {
      updateData.timeInfo = _.remove();
    }

    // 同样处理 leaveInfo
    if (leaveInfo) {
      updateData.leaveInfo = leaveInfo;
    } else {
      updateData.leaveInfo = _.remove();
    }

    if (participantResult.data.length > 0) {
      // 更新已有记录
      await db.collection('participants').doc(participantResult.data[0]._id).update({
        data: updateData
      });
    } else {
      // 创建新记录
      const participantData = {
        ...updateData,
        createdAt: db.serverDate()
      };
      // 对于新记录，如果 timeInfo/leaveInfo 为 null，直接设为 null 而不是使用 _.remove()
      if (!timeInfo) participantData.timeInfo = null;
      if (!leaveInfo) participantData.leaveInfo = null;
      await db.collection('participants').add({
        data: participantData
      });
    }

    return { success: true, msg: '投票成功' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
