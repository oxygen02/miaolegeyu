const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { dryRun = true } = event;

  try {
    // 查找所有 locked 状态的活动
    const rooms = await db.collection('rooms')
      .where({ status: 'locked' })
      .get();

    const updated = [];
    const skipped = [];

    for (const room of rooms.data) {
      const fp = room.finalPoster;
      const hasImageUrl = !!(fp && fp.imageUrl && fp.imageUrl.trim());
      const hasTime = !!(fp && fp.time && fp.time.trim());
      const hasAddress = !!(fp && fp.address && fp.address.trim());
      const hasShopName = !!(fp && fp.shopName && fp.shopName.trim());

      // 如果 finalPoster 缺少必要字段，需要修复
      if (fp && (!hasImageUrl || !hasTime || !hasAddress || !hasShopName)) {
        const updateData = {};

        // 从房间数据中补充店铺名称
        if (!hasShopName) {
          updateData['finalPoster.shopName'] = room.shopName || room.title || '';
        }

        // 从房间数据中补充图片
        if (!hasImageUrl) {
          const imageUrl = room.shopImage || room.candidatePosters?.[0]?.imageUrl || '';
          if (imageUrl) {
            updateData['finalPoster.imageUrl'] = imageUrl;
          }
        }

        // 从房间数据中补充时间
        if (!hasTime && room.activityDate && room.activityTime) {
          updateData['finalPoster.time'] = `${room.activityDate} ${room.activityTime}`;
        }

        // 从房间数据中补充地址
        if (!hasAddress) {
          const address = room.location?.name || room.location || '';
          if (address) {
            updateData['finalPoster.address'] = address;
          }
        }

        if (Object.keys(updateData).length > 0) {
          if (!dryRun) {
            await db.collection('rooms').doc(room._id).update({
              data: updateData
            });
          }

          updated.push({
            roomId: room.roomId,
            title: room.title,
            missing: {
              shopName: !hasShopName,
              imageUrl: !hasImageUrl,
              time: !hasTime,
              address: !hasAddress
            },
            fixed: Object.keys(updateData)
          });
        } else {
          skipped.push({
            roomId: room.roomId,
            title: room.title,
            reason: '无法补充缺失字段（源数据也不存在）'
          });
        }
      } else {
        skipped.push({
          roomId: room.roomId,
          title: room.title,
          status: '完整'
        });
      }
    }

    return {
      code: 0,
      data: {
        total: rooms.data.length,
        repaired: updated.length,
        skipped: skipped.length,
        updated: updated,
        skippedDetails: skipped
      },
      msg: dryRun ? '预检完成' : '修复完成'
    };
  } catch (e) {
    console.error('repairFinalPoster error:', e);
    return {
      code: -1,
      msg: e.message
    };
  }
};
