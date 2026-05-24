const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 管理员openid列表（开发用硬编码）
const ADMIN_OPENIDS = [];

// 从数据库读取管理员配置
async function getAdminOpenIdsFromDB() {
  try {
    const { data } = await db.collection('config').doc('admin').get();
    return data && data.adminOpenIds ? data.adminOpenIds : [];
  } catch (err) {
    return [];
  }
}

async function isAdmin(openid) {
  if (ADMIN_OPENIDS.includes(openid)) return true;
  const dbAdmins = await getAdminOpenIdsFromDB();
  return dbAdmins.includes(openid);
}

/**
 * 获取所有内容列表（管理员）
 * 参数：
 *   - contentType: 'room' | 'shop' | 'vote' | 'appointment' | 'all'
 *   - page: 页码
 *   - pageSize: 每页数量
 *   - status: 状态筛选
 *   - keyword: 搜索关键词
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;
  const {
    contentType = 'all',
    page = 1,
    pageSize = 20,
    status = 'all',
    keyword = ''
  } = event;

  if (!OPENID) {
    return { success: false, error: '未登录' };
  }

  const adminCheck = await isAdmin(OPENID);
  if (!adminCheck) {
    return { success: false, error: '无管理员权限' };
  }

  try {
    const results = {};
    const skip = (page - 1) * pageSize;

    // 查询房间
    if (contentType === 'all' || contentType === 'room') {
      let roomWhere = {};
      if (status !== 'all') roomWhere.status = status;
      if (keyword) {
        roomWhere.title = db.RegExp({ regexp: keyword, options: 'i' });
      }

      const roomCount = await db.collection('rooms').where(roomWhere).count();
      const { data: rooms } = await db.collection('rooms')
        .where(roomWhere)
        .orderBy('createdAt', 'desc')
        .skip(contentType === 'all' ? 0 : skip)
        .limit(contentType === 'all' ? 10 : pageSize)
        .get();

      results.rooms = {
        list: rooms.map(r => ({
          id: r.roomId,
          _id: r._id,
          title: r.title,
          type: 'room',
          status: r.status,
          creatorOpenId: r.creatorOpenId,
          creatorName: r.creatorName || '未知',
          createdAt: r.createdAt,
          participantCount: r.participantCount || 0
        })),
        total: roomCount.total
      };
    }

    // 查询店铺
    if (contentType === 'all' || contentType === 'shop') {
      let shopWhere = {};
      if (keyword) {
        shopWhere.name = db.RegExp({ regexp: keyword, options: 'i' });
      }

      const shopCount = await db.collection('shops').where(shopWhere).count();
      const { data: shops } = await db.collection('shops')
        .where(shopWhere)
        .orderBy('createdAt', 'desc')
        .skip(contentType === 'all' ? 0 : skip)
        .limit(contentType === 'all' ? 10 : pageSize)
        .get();

      results.shops = {
        list: shops.map(s => ({
          id: s._id,
          _id: s._id,
          title: s.name,
          type: 'shop',
          status: s.status || 'normal',
          creatorOpenId: s.creatorOpenId,
          creatorName: s.creatorName || '未知',
          createdAt: s.createdAt,
          address: typeof s.location === 'object' ? s.location.name : (s.location || '')
        })),
        total: shopCount.total
      };
    }

    // 查询时间投票
    if (contentType === 'all' || contentType === 'vote') {
      let voteWhere = {};
      if (status !== 'all') voteWhere.status = status;
      if (keyword) {
        voteWhere.title = db.RegExp({ regexp: keyword, options: 'i' });
      }

      const voteCount = await db.collection('schedule_votes').where(voteWhere).count();
      const { data: votes } = await db.collection('schedule_votes')
        .where(voteWhere)
        .orderBy('createdAt', 'desc')
        .skip(contentType === 'all' ? 0 : skip)
        .limit(contentType === 'all' ? 10 : pageSize)
        .get();

      results.votes = {
        list: votes.map(v => ({
          id: v._id,
          _id: v._id,
          title: v.title,
          type: 'vote',
          status: v.status,
          creatorOpenId: v.creatorOpenId,
          creatorName: v.creatorName || '未知',
          createdAt: v.createdAt,
          participantCount: v.participants?.length || 0,
          deadline: v.deadline
        })),
        total: voteCount.total
      };
    }

    // 查询约饭活动
    if (contentType === 'all' || contentType === 'appointment') {
      let aptWhere = {};
      if (status !== 'all') aptWhere.status = status;
      if (keyword) {
        aptWhere.shopName = db.RegExp({ regexp: keyword, options: 'i' });
      }

      const aptCount = await db.collection('dining_appointments').where(aptWhere).count();
      const { data: appointments } = await db.collection('dining_appointments')
        .where(aptWhere)
        .orderBy('createdAt', 'desc')
        .skip(contentType === 'all' ? 0 : skip)
        .limit(contentType === 'all' ? 10 : pageSize)
        .get();

      results.appointments = {
        list: appointments.map(a => ({
          id: a._id,
          _id: a._id,
          title: a.shopName,
          type: 'appointment',
          status: a.status || 'active',
          creatorOpenId: a.initiatorOpenId,
          creatorName: a.initiatorName || '未知',
          createdAt: a.createdAt,
          participantCount: a.participants?.length || 0
        })),
        total: aptCount.total
      };
    }

    // 如果是查询全部，合并列表
    if (contentType === 'all') {
      let allList = [];
      if (results.rooms) allList = allList.concat(results.rooms.list);
      if (results.shops) allList = allList.concat(results.shops.list);
      if (results.votes) allList = allList.concat(results.votes.list);
      if (results.appointments) allList = allList.concat(results.appointments.list);

      // 按时间排序
      allList.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      const total = (results.rooms?.total || 0) +
                    (results.shops?.total || 0) +
                    (results.votes?.total || 0) +
                    (results.appointments?.total || 0);

      return {
        success: true,
        data: {
          list: allList.slice(skip, skip + pageSize),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
          }
        }
      };
    }

    // 返回特定类型的数据
    const typeKey = contentType === 'room' ? 'rooms' :
                    contentType === 'shop' ? 'shops' :
                    contentType === 'vote' ? 'votes' : 'appointments';

    const typeData = results[typeKey] || { list: [], total: 0 };

    return {
      success: true,
      data: {
        list: typeData.list,
        pagination: {
          page,
          pageSize,
          total: typeData.total,
          totalPages: Math.ceil(typeData.total / pageSize)
        }
      }
    };
  } catch (err) {
    console.error('adminGetContents error:', err);
    return { success: false, error: err.message };
  }
};
