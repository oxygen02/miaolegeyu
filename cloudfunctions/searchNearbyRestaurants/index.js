const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 腾讯地图 API Key
const TENCENT_MAP_KEY = 'LMOBZ-MZAKQ-UUH5F-BFJIC-4YEQZ-QRFK7';

// 腾讯地图 API 基础地址
const TENCENT_MAP_BASE_URL = 'https://apis.map.qq.com';

/**
 * 调用腾讯地图API搜索附近餐厅
 * @param {Object} event - 请求参数
 * @param {Object} event.location - 位置信息 { name, address, latitude, longitude }
 * @param {string} event.keyword - 搜索关键词
 * @param {number} event.radius - 搜索半径（米），默认5000
 * @param {number} event.pageSize - 返回数量，默认20
 */
exports.main = async (event) => {
  const { location, keyword, radius = 5000, pageSize = 20 } = event;

  try {
    // 获取经纬度
    let latitude, longitude;

    if (location && location.latitude && location.longitude) {
      // 直接使用传入的坐标
      latitude = location.latitude;
      longitude = location.longitude;
    } else if (location && location.name) {
      // 通过地址解析获取坐标
      const geoResult = await geocoder(location.name);
      if (geoResult && geoResult.location) {
        latitude = geoResult.location.lat;
        longitude = geoResult.location.lng;
      }
    }

    if (!latitude || !longitude) {
      return {
        code: -1,
        msg: '无法获取位置坐标',
        data: []
      };
    }

    // 调用腾讯地图周边搜索API
    const searchResult = await searchNearby(
      latitude,
      longitude,
      keyword || '美食',
      radius,
      pageSize
    );

    if (!searchResult || searchResult.status !== 0) {
      console.error('腾讯地图API返回错误:', searchResult);
      return {
        code: -1,
        msg: searchResult?.message || '搜索失败',
        data: []
      };
    }

    // 获取搜索结果中的餐厅列表
    const rawRestaurants = searchResult.data || [];

    // 为每个餐厅获取详情（包含图片）
    const restaurantsWithDetails = await Promise.all(
      rawRestaurants.map(async (item) => {
        const detail = await getPlaceDetail(item.id);
        return { ...item, detail };
      })
    );

    // 格式化返回数据
    const restaurants = formatRestaurants(restaurantsWithDetails);

    return {
      code: 0,
      msg: '搜索成功',
      data: restaurants
    };

  } catch (err) {
    console.error('搜索附近餐厅失败:', err);
    return {
      code: -1,
      msg: err.message || '搜索失败',
      data: []
    };
  }
};

/**
 * 地址解析（地址转坐标）
 */
async function geocoder(address) {
  try {
    const url = `${TENCENT_MAP_BASE_URL}/ws/geocoder/v1/?address=${encodeURIComponent(address)}&key=${TENCENT_MAP_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 0 && data.result && data.result.location) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error('地址解析失败:', err);
    return null;
  }
}

/**
 * 周边搜索
 */
async function searchNearby(lat, lng, keyword, radius, pageSize) {
  try {
    // 构建请求URL
    const params = new URLSearchParams({
      key: TENCENT_MAP_KEY,
      keyword: keyword,
      boundary: `nearby(${lat},${lng},${radius},1)`,
      page_size: Math.min(pageSize, 20).toString(),
      page_index: '1',
      orderby: '_distance'
    });

    const url = `${TENCENT_MAP_BASE_URL}/ws/place/v1/search?${params.toString()}`;
    console.log('腾讯地图搜索URL:', url);

    const response = await fetch(url);
    const data = await response.json();
    console.log('腾讯地图搜索结果:', JSON.stringify(data));

    return data;
  } catch (err) {
    console.error('周边搜索失败:', err);
    return null;
  }
}

/**
 * 获取地点详情（包含图片）
 * @param {string} placeId - 地点ID
 */
async function getPlaceDetail(placeId) {
  if (!placeId) return null;

  try {
    const params = new URLSearchParams({
      key: TENCENT_MAP_KEY,
      id: placeId
    });

    const url = `${TENCENT_MAP_BASE_URL}/ws/place/v1/detail?${params.toString()}`;
    console.log('腾讯地图详情URL:', url);

    const response = await fetch(url);
    const data = await response.json();
    console.log('腾讯地图详情结果:', JSON.stringify(data));

    if (data.status === 0 && data.result) {
      return data.result;
    }
    return null;
  } catch (err) {
    console.error('获取地点详情失败:', err);
    return null;
  }
}

/**
 * 格式化餐厅数据
 */
function formatRestaurants(rawData) {
  if (!Array.isArray(rawData)) return [];

  return rawData.map(item => {
    // 计算距离（米转公里）
    let distance = item._distance || 0;
    let distanceText = '';
    if (distance < 1000) {
      distanceText = `${Math.round(distance)}m`;
      distance = (distance / 1000).toFixed(1);
    } else {
      distance = (distance / 1000).toFixed(1);
      distanceText = `${distance}km`;
    }

    // 解析人均消费
    let avgPrice = '';
    if (item.category && typeof item.category === 'string') {
      // 尝试从分类中提取价格信息
      const priceMatch = item.category.match(/(\d+)/);
      if (priceMatch) {
        avgPrice = priceMatch[1];
      }
    }

    // 从详情中获取图片
    let image = '';
    if (item.detail && item.detail.photos && item.detail.photos.length > 0) {
      // 腾讯地图返回的图片URL
      image = item.detail.photos[0].url || '';
    }

    return {
      id: item.id || '',
      name: item.title || '未知餐厅',
      address: item.address || '',
      phone: item.tel || '',
      // 腾讯地图返回的评分字段
      rating: item.rating ? parseFloat(item.rating) : null,
      // 人均消费
      avgPrice: avgPrice,
      // 距离（公里）
      distance: parseFloat(distance),
      distanceText: distanceText,
      // 菜系类型
      cuisineType: item.category || '',
      // 坐标
      latitude: item.location?.lat || 0,
      longitude: item.location?.lng || 0,
      // 店铺图片
      image: image,
      // 原始数据
      raw: item
    };
  });
}