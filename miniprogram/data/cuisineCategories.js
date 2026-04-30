// 餐饮分类数据 - 20个大类及细类
// 图片路径: cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_XX_YY.png
// 数据与编号对照表.md完全一致
const cuisineCategories = [
  {
    id: 'chuanyu',
    name: '川渝',
    pinyin: 'JIAO',
    desc: '麻辣重口、江湖硬菜',
    icon: '椒',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_00.png',
    subCategories: [
      { name: '经典川菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_01.png' },
      { name: '重庆江湖菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_02.png' },
      { name: '水煮干锅菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_03.png' },
      { name: '麻辣家常菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_04.png' },
      { name: '自贡盐帮菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_01_05.png' }
    ]
  },
  {
    id: 'xianggan',
    name: '湘赣',
    pinyin: 'LA',
    desc: '鲜辣下饭、土味浓郁',
    icon: '辣',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_00.png',
    subCategories: [
      { name: '精品湘菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_01.png' },
      { name: '江西特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_02.png' },
      { name: '农家辣味土菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_03.png' },
      { name: '特色下饭馆', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_04.png' },
      { name: '风味腊味菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_02_05.png' }
    ]
  },
  {
    id: 'yueshi',
    name: '粤式',
    pinyin: 'CHA',
    desc: '清淡鲜美、早茶烧腊',
    icon: '茶',
    color: '#FFF8DC',
    darkColor: '#FFA502',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_00.png',
    subCategories: [
      { name: '正统粤菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_01.png' },
      { name: '潮汕风味菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_02.png' },
      { name: '港式茶餐厅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_03.png' },
      { name: '广式烧腊', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_04.png' },
      { name: '粤式早茶点心', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_03_05.png' }
    ]
  },
  {
    id: 'jiangnan',
    name: '江南',
    pinyin: 'TIAN',
    desc: '鲜甜适口、口味温和',
    icon: '甜',
    color: '#FFF8DC',
    darkColor: '#FFA502',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_00.png',
    subCategories: [
      { name: '江浙融合菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_01.png' },
      { name: '上海本帮菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_02.png' },
      { name: '淮扬精致菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_03.png' },
      { name: '杭帮家常菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_04.png' },
      { name: '江南清淡菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_04_05.png' }
    ]
  },
  {
    id: 'beifang',
    name: '北方',
    pinyin: 'BEI',
    desc: '量大实惠、硬菜丰富',
    icon: '北',
    color: '#FFF8DC',
    darkColor: '#FFA502',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_00.png',
    subCategories: [
      { name: '东北特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_01.png' },
      { name: '鲁菜胶东菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_02.png' },
      { name: '老北京风味菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_03.png' },
      { name: '华北家常菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_04.png' },
      { name: '中原豫菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_05.png' },
      { name: '铁锅炖', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_05_06.png' }
    ]
  },
  {
    id: 'xibei',
    name: '西北',
    pinyin: 'MIAN',
    desc: '浓郁牛羊肉、西北硬核风味',
    icon: '面',
    color: '#F5F5DC',
    darkColor: '#C4A35A',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_00.png',
    subCategories: [
      { name: '陕西特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_01.png' },
      { name: '新疆风味餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_02.png' },
      { name: '甘肃特色风味', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_03.png' },
      { name: '内蒙蒙餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_04.png' },
      { name: '西北清真硬菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_06_05.png' }
    ]
  },
  {
    id: 'yungui',
    name: '云贵',
    pinyin: 'JUN',
    desc: '酸辣山野风味，特色小众聚餐',
    icon: '菌',
    color: '#F0FFF0',
    darkColor: '#2ED573',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_00.png',
    subCategories: [
      { name: '云南滇菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_01.png' },
      { name: '贵州酸汤菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_02.png' },
      { name: '广西特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_03.png' },
      { name: '傣味特色料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_04.png' },
      { name: '山野风味菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_07_05.png' }
    ]
  },
  {
    id: 'huazhong',
    name: '华中',
    pinyin: 'OU',
    desc: '中部地域特色',
    icon: '藕',
    color: '#F0FFFF',
    darkColor: '#1DD1A1',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_00.png',
    subCategories: [
      { name: '湖北鄂菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_01.png' },
      { name: '闽南特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_02.png' },
      { name: '徽菜皖味', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_03.png' },
      { name: '客家私房菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_04.png' },
      { name: '海南琼菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_08_05.png' }
    ]
  },
  {
    id: 'huoguo',
    name: '火锅',
    pinyin: 'GUO',
    desc: '聚餐天花板，多人围坐',
    icon: '锅',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_00.png',
    subCategories: [
      { name: '川渝牛油火锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_01.png' },
      { name: '潮汕牛肉火锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_02.png' },
      { name: '老北京铜锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_03.png' },
      { name: '羊蝎子汤锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_04.png' },
      { name: '猪肚鸡煲锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_05.png' },
      { name: '鱼蛙主题火锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_06.png' },
      { name: '清汤养生火锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_09_07.png' }
    ]
  },
  {
    id: 'chuanchuan',
    name: '串串',
    pinyin: 'CHUAN',
    desc: '灵活选菜、性价比高',
    icon: '串',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_00.png',
    subCategories: [
      { name: '冷热串串', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_01.png' },
      { name: '麻辣香锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_02.png' },
      { name: '干锅系列菜品', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_03.png' },
      { name: '钵钵鸡冷串', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_04.png' },
      { name: '围炉涮串串', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_10_05.png' }
    ]
  },
  {
    id: 'shaokao',
    name: '烧烤烤肉',
    pinyin: 'KAO',
    desc: '夜宵、聚会、聊天刚需',
    icon: '烤',
    color: '#FFF8DC',
    darkColor: '#FFA502',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_00.png',
    subCategories: [
      { name: '中式传统烤串', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_01.png' },
      { name: '韩式炭火烤肉', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_02.png' },
      { name: '日式精致烧肉', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_03.png' },
      { name: '铁板烧料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_04.png' },
      { name: '烤羊排烤全羊', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_05.png' },
      { name: '东北烤肉', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_11_06.png' }
    ]
  },
  {
    id: 'longxia',
    name: '小龙虾',
    pinyin: 'XIA',
    desc: '夏夜聚会、重口下酒',
    icon: '虾',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_00.png',
    subCategories: [
      { name: '麻辣小龙虾', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_01.png' },
      { name: '炭火特色烤鱼', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_02.png' },
      { name: '香辣蟹大餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_03.png' },
      { name: '花甲田螺排档', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_04.png' },
      { name: '纸包鱼专项', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_12_05.png' }
    ]
  },
  {
    id: 'riliao',
    name: '日料',
    pinyin: 'YI',
    desc: '精致清淡、轻奢约会',
    icon: '鮨',
    color: '#F0F8FF',
    darkColor: '#54A0FF',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_00.png',
    subCategories: [
      { name: '寿司刺身料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_01.png' },
      { name: '日式居酒屋', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_02.png' },
      { name: '日式炭火烧肉', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_03.png' },
      { name: '日式定食正餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_04.png' },
      { name: '日式寿喜烧', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_13_05.png' }
    ]
  },
  {
    id: 'hanliao',
    name: '韩料',
    pinyin: 'BAN',
    desc: '甜辣口味，年轻群体热门',
    icon: '拌',
    color: '#FFF0F5',
    darkColor: '#FF9FF3',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_00.png',
    subCategories: [
      { name: '韩式正餐料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_01.png' },
      { name: '韩式烤肉', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_02.png' },
      { name: '韩式部队火锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_03.png' },
      { name: '韩式特色汤锅', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_04.png' },
      { name: '韩餐硬核硬菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_14_05.png' }
    ]
  },
  {
    id: 'dongnanya',
    name: '东南亚',
    pinyin: 'YE',
    desc: '酸甜辛香，口味独特',
    icon: '椰',
    color: '#F5FFFA',
    darkColor: '#48DBFB',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_00.png',
    subCategories: [
      { name: '泰国菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_01.png' },
      { name: '越南料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_02.png' },
      { name: '新加坡风味', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_03.png' },
      { name: '马来西亚菜系', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_04.png' },
      { name: '东南亚融合菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_15_05.png' }
    ]
  },
  {
    id: 'xishi',
    name: '西式',
    pinyin: 'CAN',
    desc: '商务、约会、正式聚餐',
    icon: '餐',
    color: '#F0F8FF',
    darkColor: '#54A0FF',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_00.png',
    subCategories: [
      { name: '经典牛排西餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_01.png' },
      { name: '意大利正餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_02.png' },
      { name: '法式精致料理', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_03.png' },
      { name: '德式传统西餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_04.png' },
      { name: '俄式经典正餐', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_16_05.png' }
    ]
  },
  {
    id: 'haixian',
    name: '海鲜',
    pinyin: 'XIAN',
    desc: '鲜货大餐，宴请首选',
    icon: '鲜',
    color: '#F0FFFF',
    darkColor: '#1DD1A1',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_00.png',
    subCategories: [
      { name: '蒸汽海鲜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_01.png' },
      { name: '海鲜大排档', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_02.png' },
      { name: '高端海鲜酒楼', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_03.png' },
      { name: '海鲜特色小炒', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_04.png' },
      { name: '生蚝龙虾专项', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_17_05.png' }
    ]
  },
  {
    id: 'zizhu',
    name: '自助',
    pinyin: 'CHANG',
    desc: '不限量畅吃',
    icon: '畅',
    color: '#FFF8DC',
    darkColor: '#FFA502',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_00.png',
    subCategories: [
      { name: '经典火锅自助', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_01.png' },
      { name: '炭火烤肉自助', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_02.png' },
      { name: '豪华海鲜自助', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_03.png' },
      { name: '综合全能自助', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_04.png' },
      { name: '高端料理自助', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_18_05.png' }
    ]
  },
  {
    id: 'nongjia',
    name: '农家',
    pinyin: 'TU',
    desc: '乡土家常菜',
    icon: '土',
    color: '#F5F5DC',
    darkColor: '#C4A35A',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_00.png',
    subCategories: [
      { name: '乡村土菜馆', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_01.png' },
      { name: '农家大院菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_02.png' },
      { name: '山野家常菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_03.png' },
      { name: '田园特色菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_04.png' },
      { name: '柴火灶炖菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_19_05.png' }
    ]
  },
  {
    id: 'sifang',
    name: '私房',
    pinyin: 'SI',
    desc: '小众高级、创意菜品',
    icon: '私',
    color: '#FFF0F5',
    darkColor: '#FF9FF3',
    image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_00.png',
    subCategories: [
      { name: '高端私房菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_01.png' },
      { name: '无国界融合菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_02.png' },
      { name: '创意意境菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_03.png' },
      { name: '小众特色私厨', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_04.png' },
      { name: '精致宴席菜', image: 'cloud://cloud1-d5ggnf5wh2d872f3c.636c-cloud1-d5ggnf5wh2d872f3c-1423896909/cuisine-images/category_20_05.png' }
    ]
  }
];

module.exports = {
  cuisineCategories
};
