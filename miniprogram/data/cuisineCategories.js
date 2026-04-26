// 餐饮分类数据 - 20个大类及细类
// 图片路径: /assets/images/cuisine_all/category_XX_YY.png
const cuisineCategories = [
  {
    id: 'chuanyu',
    name: '川渝',
    pinyin: 'JIAO',
    desc: '麻辣重口、江湖硬菜',
    icon: '椒',
    color: '#FFE4E1',
    darkColor: '#FF6B6B',
    image: '/assets/images/cuisine_all/category_01_00.png',
    subCategories: [
      { name: '麻辣火锅', image: '/assets/images/cuisine_all/category_01_01.png' },
      { name: '水煮鱼', image: '/assets/images/cuisine_all/category_01_02.png' },
      { name: '回锅肉', image: '/assets/images/cuisine_all/category_01_03.png' },
      { name: '宫保鸡丁', image: '/assets/images/cuisine_all/category_01_04.png' },
      { name: '麻婆豆腐', image: '/assets/images/cuisine_all/category_01_05.png' }
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
    image: '/assets/images/cuisine_all/category_02_00.png',
    subCategories: [
      { name: '剁椒鱼头', image: '/assets/images/cuisine_all/category_02_01.png' },
      { name: '辣椒炒肉', image: '/assets/images/cuisine_all/category_02_02.png' },
      { name: '口味虾', image: '/assets/images/cuisine_all/category_02_03.png' },
      { name: '农家小炒', image: '/assets/images/cuisine_all/category_02_04.png' },
      { name: '啤酒鸭', image: '/assets/images/cuisine_all/category_02_05.png' }
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
    image: '/assets/images/cuisine_all/category_03_00.png',
    subCategories: [
      { name: '虾饺', image: '/assets/images/cuisine_all/category_03_01.png' },
      { name: '烧鹅', image: '/assets/images/cuisine_all/category_03_02.png' },
      { name: '叉烧', image: '/assets/images/cuisine_all/category_03_03.png' },
      { name: '肠粉', image: '/assets/images/cuisine_all/category_03_04.png' },
      { name: '煲仔饭', image: '/assets/images/cuisine_all/category_03_05.png' }
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
    image: '/assets/images/cuisine_all/category_04_00.png',
    subCategories: [
      { name: '红烧肉', image: '/assets/images/cuisine_all/category_04_01.png' },
      { name: '糖醋排骨', image: '/assets/images/cuisine_all/category_04_02.png' },
      { name: '清蒸鱼', image: '/assets/images/cuisine_all/category_04_03.png' },
      { name: '白切鸡', image: '/assets/images/cuisine_all/category_04_04.png' },
      { name: '生煎包', image: '/assets/images/cuisine_all/category_04_05.png' }
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
    image: '/assets/images/cuisine_all/category_05_00.png',
    subCategories: [
      { name: '北京烤鸭', image: '/assets/images/cuisine_all/category_05_01.png' },
      { name: '锅包肉', image: '/assets/images/cuisine_all/category_05_02.png' },
      { name: '地三鲜', image: '/assets/images/cuisine_all/category_05_03.png' },
      { name: '猪肉炖粉条', image: '/assets/images/cuisine_all/category_05_04.png' },
      { name: '炸酱面', image: '/assets/images/cuisine_all/category_05_05.png' },
      { name: '东北乱炖', image: '/assets/images/cuisine_all/category_05_06.png' }
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
    image: '/assets/images/cuisine_all/category_06_00.png',
    subCategories: [
      { name: '羊肉泡馍', image: '/assets/images/cuisine_all/category_06_01.png' },
      { name: '肉夹馍', image: '/assets/images/cuisine_all/category_06_02.png' },
      { name: '凉皮', image: '/assets/images/cuisine_all/category_06_03.png' },
      { name: '大盘鸡', image: '/assets/images/cuisine_all/category_06_04.png' },
      { name: '拉面', image: '/assets/images/cuisine_all/category_06_05.png' }
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
    image: '/assets/images/cuisine_all/category_07_00.png',
    subCategories: [
      { name: '过桥米线', image: '/assets/images/cuisine_all/category_07_01.png' },
      { name: '汽锅鸡', image: '/assets/images/cuisine_all/category_07_02.png' },
      { name: '酸汤鱼', image: '/assets/images/cuisine_all/category_07_03.png' },
      { name: '野生菌', image: '/assets/images/cuisine_all/category_07_04.png' },
      { name: '竹筒饭', image: '/assets/images/cuisine_all/category_07_05.png' }
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
    image: '/assets/images/cuisine_all/category_08_00.png',
    subCategories: [
      { name: '热干面', image: '/assets/images/cuisine_all/category_08_01.png' },
      { name: '鸭脖', image: '/assets/images/cuisine_all/category_08_02.png' },
      { name: '三鲜豆皮', image: '/assets/images/cuisine_all/category_08_03.png' },
      { name: '武昌鱼', image: '/assets/images/cuisine_all/category_08_04.png' },
      { name: '莲藕排骨汤', image: '/assets/images/cuisine_all/category_08_05.png' }
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
    image: '/assets/images/cuisine_all/category_09_00.png',
    subCategories: [
      { name: '重庆火锅', image: '/assets/images/cuisine_all/category_09_01.png' },
      { name: '老北京涮肉', image: '/assets/images/cuisine_all/category_09_02.png' },
      { name: '花胶鸡', image: '/assets/images/cuisine_all/category_09_03.png' },
      { name: '猪肚鸡', image: '/assets/images/cuisine_all/category_09_07.png' },
      { name: '椰子鸡', image: '/assets/images/cuisine_all/category_09_05.png' },
      { name: '潮汕牛肉锅', image: '/assets/images/cuisine_all/category_09_06.png' },
      { name: '羊蝎子', image: '/assets/images/cuisine_all/category_09_04.png' }
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
    image: '/assets/images/cuisine_all/category_10_00.png',
    subCategories: [
      { name: '成都串串', image: '/assets/images/cuisine_all/category_10_01.png' },
      { name: '麻辣烫', image: '/assets/images/cuisine_all/category_10_02.png' },
      { name: '麻辣香锅', image: '/assets/images/cuisine_all/category_10_03.png' },
      { name: '冒菜', image: '/assets/images/cuisine_all/category_10_04.png' },
      { name: '钵钵鸡', image: '/assets/images/cuisine_all/category_10_05.png' }
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
    image: '/assets/images/cuisine_all/category_11_00.png',
    subCategories: [
      { name: '东北烧烤', image: '/assets/images/cuisine_all/category_11_01.png' },
      { name: '韩式烤肉', image: '/assets/images/cuisine_all/category_11_02.png' },
      { name: '日式烧鸟', image: '/assets/images/cuisine_all/category_11_03.png' },
      { name: '新疆烤肉', image: '/assets/images/cuisine_all/category_11_04.png' },
      { name: '烤羊腿', image: '/assets/images/cuisine_all/category_11_05.png' },
      { name: '烤海鲜', image: '/assets/images/cuisine_all/category_11_06.png' }
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
    image: '/assets/images/cuisine_all/category_12_00.png',
    subCategories: [
      { name: '麻辣小龙虾', image: '/assets/images/cuisine_all/category_12_01.png' },
      { name: '蒜蓉小龙虾', image: '/assets/images/cuisine_all/category_12_02.png' },
      { name: '烤鱼', image: '/assets/images/cuisine_all/category_12_03.png' },
      { name: '纸包鱼', image: '/assets/images/cuisine_all/category_12_04.png' },
      { name: '干锅牛蛙', image: '/assets/images/cuisine_all/category_12_05.png' }
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
    image: '/assets/images/cuisine_all/category_13_00.png',
    subCategories: [
      { name: '寿司', image: '/assets/images/cuisine_all/category_13_01.png' },
      { name: '刺身', image: '/assets/images/cuisine_all/category_13_02.png' },
      { name: '拉面', image: '/assets/images/cuisine_all/category_13_03.png' },
      { name: '天妇罗', image: '/assets/images/cuisine_all/category_13_04.png' },
      { name: '居酒屋', image: '/assets/images/cuisine_all/category_13_05.png' }
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
    image: '/assets/images/cuisine_all/category_14_00.png',
    subCategories: [
      { name: '石锅拌饭', image: '/assets/images/cuisine_all/category_14_01.png' },
      { name: '部队锅', image: '/assets/images/cuisine_all/category_14_02.png' },
      { name: '炸鸡啤酒', image: '/assets/images/cuisine_all/category_14_03.png' },
      { name: '冷面', image: '/assets/images/cuisine_all/category_14_04.png' },
      { name: '泡菜汤', image: '/assets/images/cuisine_all/category_14_05.png' }
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
    image: '/assets/images/cuisine_all/category_15_00.png',
    subCategories: [
      { name: '泰国菜', image: '/assets/images/cuisine_all/category_15_01.png' },
      { name: '越南粉', image: '/assets/images/cuisine_all/category_15_02.png' },
      { name: '新加坡菜', image: '/assets/images/cuisine_all/category_15_03.png' },
      { name: '马来西亚', image: '/assets/images/cuisine_all/category_15_04.png' },
      { name: '印尼菜', image: '/assets/images/cuisine_all/category_15_05.png' }
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
    image: '/assets/images/cuisine_all/category_16_00.png',
    subCategories: [
      { name: '牛排', image: '/assets/images/cuisine_all/category_16_01.png' },
      { name: '意大利面', image: '/assets/images/cuisine_all/category_16_02.png' },
      { name: '披萨', image: '/assets/images/cuisine_all/category_16_03.png' },
      { name: '汉堡', image: '/assets/images/cuisine_all/category_16_04.png' },
      { name: '法式料理', image: '/assets/images/cuisine_all/category_16_05.png' }
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
    image: '/assets/images/cuisine_all/category_17_00.png',
    subCategories: [
      { name: '海鲜大咖', image: '/assets/images/cuisine_all/category_17_01.png' },
      { name: '蒸汽海鲜', image: '/assets/images/cuisine_all/category_17_02.png' },
      { name: '海鲜自助', image: '/assets/images/cuisine_all/category_17_03.png' },
      { name: '生蚝', image: '/assets/images/cuisine_all/category_17_04.png' },
      { name: '螃蟹', image: '/assets/images/cuisine_all/category_17_05.png' }
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
    image: '/assets/images/cuisine_all/category_18_00.png',
    subCategories: [
      { name: '日料自助', image: '/assets/images/cuisine_all/category_18_01.png' },
      { name: '烤肉自助', image: '/assets/images/cuisine_all/category_18_02.png' },
      { name: '火锅自助', image: '/assets/images/cuisine_all/category_18_03.png' },
      { name: '海鲜自助', image: '/assets/images/cuisine_all/category_18_04.png' },
      { name: '酒店自助', image: '/assets/images/cuisine_all/category_18_05.png' }
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
    image: '/assets/images/cuisine_all/category_19_00.png',
    subCategories: [
      { name: '土鸡汤', image: '/assets/images/cuisine_all/category_19_01.png' },
      { name: '农家小炒', image: '/assets/images/cuisine_all/category_19_02.png' },
      { name: '腊肉', image: '/assets/images/cuisine_all/category_19_03.png' },
      { name: '野菜', image: '/assets/images/cuisine_all/category_19_04.png' },
      { name: '土鸡蛋', image: '/assets/images/cuisine_all/category_19_05.png' }
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
    image: '/assets/images/cuisine_all/category_20_00.png',
    subCategories: [
      { name: '创意菜', image: '/assets/images/cuisine_all/category_20_01.png' },
      { name: '分子料理', image: '/assets/images/cuisine_all/category_20_02.png' },
      { name: '私房菜', image: '/assets/images/cuisine_all/category_20_03.png' },
      { name: '融合菜', image: '/assets/images/cuisine_all/category_20_04.png' },
      { name: '精致中餐', image: '/assets/images/cuisine_all/category_20_05.png' }
    ]
  }
];

module.exports = {
  cuisineCategories
};
