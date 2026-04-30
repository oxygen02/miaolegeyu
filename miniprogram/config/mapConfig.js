// 腾讯地图 API 配置
const TENCENT_MAP_KEY = 'LMOBZ-MZAKQ-UUH5F-BFJIC-4YEQZ-QRFK7';

// 腾讯地图 API 基础地址
const TENCENT_MAP_BASE_URL = 'https://apis.map.qq.com';

// 接口地址
const API_ENDPOINTS = {
  // 地点搜索（周边搜索）
  placeSearch: '/ws/place/v1/search',
  // 地点详情
  placeDetail: '/ws/place/v1/detail',
  // 关键词输入提示
  suggestion: '/ws/place/v1/suggestion',
  // 逆地址解析（坐标转地址）
  geocoder: '/ws/geocoder/v1/',
  // 地址解析（地址转坐标）
  geo: '/ws/geocoder/v1/'
};

// 搜索半径（米）
const SEARCH_RADIUS = 5000;

// 默认返回数量
const DEFAULT_PAGE_SIZE = 20;

module.exports = {
  TENCENT_MAP_KEY,
  TENCENT_MAP_BASE_URL,
  API_ENDPOINTS,
  SEARCH_RADIUS,
  DEFAULT_PAGE_SIZE
};