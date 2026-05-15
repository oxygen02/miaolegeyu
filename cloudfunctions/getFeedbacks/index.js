const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

/**
 * 管理员查看反馈列表
 * 支持按状态筛选、分页、排序
 */
exports.main = async (event) => {
  const { 
    status,           // 筛选状态: pending, processing, resolved
    type,             // 筛选类型: bug, feature, ui, performance, other
    page = 1,         // 当前页码
    pageSize = 20,    // 每页条数
    sortBy = 'createTime', // 排序字段
    sortOrder = 'desc'     // 排序方向: asc, desc
  } = event;

  try {
    // 构建查询条件
    let where = {};
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (type && type !== 'all') {
      where.type = type;
    }

    // 计算分页
    const skip = (page - 1) * pageSize;

    // 构建排序
    const orderBy = {};
    orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';

    // 查询反馈列表
    const feedbackRes = await db.collection('feedbacks')
      .where(where)
      .orderBy(sortBy, sortOrder)
      .skip(skip)
      .limit(pageSize)
      .get();

    // 查询总数
    const countRes = await db.collection('feedbacks')
      .where(where)
      .count();

    // 统计各状态数量
    const statusStats = await db.collection('feedbacks')
      .aggregate()
      .group({
        _id: '$status',
        count: _.sum(1)
      })
      .end();

    // 统计各类型数量
    const typeStats = await db.collection('feedbacks')
      .aggregate()
      .group({
        _id: '$type',
        count: _.sum(1)
      })
      .end();

    return {
      success: true,
      data: {
        list: feedbackRes.data,
        pagination: {
          page,
          pageSize,
          total: countRes.total,
          totalPages: Math.ceil(countRes.total / pageSize)
        },
        stats: {
          status: statusStats.list || [],
          type: typeStats.list || []
        }
      }
    };

  } catch (err) {
    console.error('获取反馈列表失败:', err);
    return {
      success: false,
      msg: '获取反馈列表失败: ' + err.message
    };
  }
};