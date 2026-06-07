// 热门城市数据
const HOT_CITIES = [
  { code: '110100', name: '北京市', province: '北京' },
  { code: '310100', name: '上海市', province: '上海' },
  { code: '440100', name: '广州市', province: '广东' },
  { code: '440300', name: '深圳市', province: '广东' },
  { code: '510100', name: '成都市', province: '四川' },
  { code: '330100', name: '杭州市', province: '浙江' },
  { code: '320100', name: '南京市', province: '江苏' },
  { code: '420100', name: '武汉市', province: '湖北' },
  { code: '500100', name: '重庆市', province: '重庆' },
  { code: '610100', name: '西安市', province: '陕西' },
  { code: '370100', name: '济南市', province: '山东' },
  { code: '410100', name: '郑州市', province: '河南' }
];

// 完整城市数据（用于搜索）
const ALL_CITIES = [
  // 直辖市
  { code: '110100', name: '北京市', province: '北京', pinyin: 'beijing' },
  { code: '310100', name: '上海市', province: '上海', pinyin: 'shanghai' },
  { code: '500100', name: '重庆市', province: '重庆', pinyin: 'chongqing' },
  { code: '120100', name: '天津市', province: '天津', pinyin: 'tianjin' },
  
  // 广东省
  { code: '440100', name: '广州市', province: '广东', pinyin: 'guangzhou' },
  { code: '440300', name: '深圳市', province: '广东', pinyin: 'shenzhen' },
  { code: '440600', name: '佛山市', province: '广东', pinyin: 'foshan' },
  { code: '441900', name: '东莞市', province: '广东', pinyin: 'dongguan' },
  { code: '440400', name: '珠海市', province: '广东', pinyin: 'zhuhai' },
  { code: '440500', name: '汕头市', province: '广东', pinyin: 'shantou' },
  { code: '441200', name: '肇庆市', province: '广东', pinyin: 'zhaoqing' },
  { code: '441600', name: '河源市', province: '广东', pinyin: 'heyuan' },
  { code: '441700', name: '阳江市', province: '广东', pinyin: 'yangjiang' },
  { code: '441800', name: '清远市', province: '广东', pinyin: 'qingyuan' },
  { code: '440200', name: '韶关市', province: '广东', pinyin: 'shaoguan' },
  { code: '440700', name: '江门市', province: '广东', pinyin: 'jiangmen' },
  { code: '440800', name: '湛江市', province: '广东', pinyin: 'zhanjiang' },
  { code: '440900', name: '茂名市', province: '广东', pinyin: 'maoming' },
  { code: '441300', name: '惠州市', province: '广东', pinyin: 'huizhou' },
  { code: '441400', name: '梅州市', province: '广东', pinyin: 'meizhou' },
  { code: '441500', name: '汕尾市', province: '广东', pinyin: 'shanwei' },
  { code: '445100', name: '潮州市', province: '广东', pinyin: 'chaozhou' },
  { code: '445200', name: '揭阳市', province: '广东', pinyin: 'jieyang' },
  { code: '445300', name: '云浮市', province: '广东', pinyin: 'yunfu' },

  // 四川省
  { code: '510100', name: '成都市', province: '四川', pinyin: 'chengdu' },
  { code: '511300', name: '南充市', province: '四川', pinyin: 'nanchong' },
  { code: '510700', name: '绵阳市', province: '四川', pinyin: 'mianyang' },
  { code: '510300', name: '自贡市', province: '四川', pinyin: 'zigong' },
  { code: '510400', name: '攀枝花市', province: '四川', pinyin: 'panzhihua' },
  { code: '510500', name: '泸州市', province: '四川', pinyin: 'luzhou' },
  { code: '510600', name: '德阳市', province: '四川', pinyin: 'deyang' },
  { code: '510800', name: '广元市', province: '四川', pinyin: 'guangyuan' },
  { code: '510900', name: '遂宁市', province: '四川', pinyin: 'suining' },
  { code: '511000', name: '内江市', province: '四川', pinyin: 'neijiang' },
  { code: '511100', name: '乐山市', province: '四川', pinyin: 'leshan' },
  { code: '511400', name: '眉山市', province: '四川', pinyin: 'meishan' },
  { code: '511500', name: '宜宾市', province: '四川', pinyin: 'yibin' },
  { code: '511600', name: '广安市', province: '四川', pinyin: 'guangan' },
  { code: '511700', name: '达州市', province: '四川', pinyin: 'dazhou' },
  { code: '511800', name: '雅安市', province: '四川', pinyin: 'yaan' },
  { code: '511900', name: '巴中市', province: '四川', pinyin: 'bazhong' },
  { code: '512000', name: '资阳市', province: '四川', pinyin: 'ziyang' },
  { code: '513200', name: '阿坝州', province: '四川', pinyin: 'aba' },
  { code: '513300', name: '甘孜州', province: '四川', pinyin: 'ganzi' },
  { code: '513400', name: '凉山州', province: '四川', pinyin: 'liangshan' },

  // 浙江省
  { code: '330100', name: '杭州市', province: '浙江', pinyin: 'hangzhou' },
  { code: '330200', name: '宁波市', province: '浙江', pinyin: 'ningbo' },
  { code: '330300', name: '温州市', province: '浙江', pinyin: 'wenzhou' },
  { code: '330400', name: '嘉兴市', province: '浙江', pinyin: 'jiaxing' },
  { code: '330500', name: '湖州市', province: '浙江', pinyin: 'huzhou' },
  { code: '330600', name: '绍兴市', province: '浙江', pinyin: 'shaoxing' },
  { code: '330700', name: '金华市', province: '浙江', pinyin: 'jinhua' },
  { code: '330800', name: '衢州市', province: '浙江', pinyin: 'quzhou' },
  { code: '330900', name: '舟山市', province: '浙江', pinyin: 'zhoushan' },
  { code: '331000', name: '台州市', province: '浙江', pinyin: 'taizhou' },
  { code: '331100', name: '丽水市', province: '浙江', pinyin: 'lishui' },

  // 江苏省
  { code: '320100', name: '南京市', province: '江苏', pinyin: 'nanjing' },
  { code: '320200', name: '无锡市', province: '江苏', pinyin: 'wuxi' },
  { code: '320300', name: '徐州市', province: '江苏', pinyin: 'xuzhou' },
  { code: '320400', name: '常州市', province: '江苏', pinyin: 'changzhou' },
  { code: '320500', name: '苏州市', province: '江苏', pinyin: 'suzhou' },
  { code: '320600', name: '南通市', province: '江苏', pinyin: 'nantong' },
  { code: '320700', name: '连云港市', province: '江苏', pinyin: 'lianyungang' },
  { code: '320800', name: '淮安市', province: '江苏', pinyin: 'huaian' },
  { code: '320900', name: '盐城市', province: '江苏', pinyin: 'yancheng' },
  { code: '321000', name: '扬州市', province: '江苏', pinyin: 'yangzhou' },
  { code: '321100', name: '镇江市', province: '江苏', pinyin: 'zhenjiang' },
  { code: '321200', name: '泰州市', province: '江苏', pinyin: 'taizhou' },
  { code: '321300', name: '宿迁市', province: '江苏', pinyin: 'suqian' },

  // 湖北省
  { code: '420100', name: '武汉市', province: '湖北', pinyin: 'wuhan' },
  { code: '420200', name: '黄石市', province: '湖北', pinyin: 'huangshi' },
  { code: '420300', name: '十堰市', province: '湖北', pinyin: 'shiyan' },
  { code: '420500', name: '宜昌市', province: '湖北', pinyin: 'yichang' },
  { code: '420600', name: '襄阳市', province: '湖北', pinyin: 'xiangyang' },
  { code: '420700', name: '鄂州市', province: '湖北', pinyin: 'ezhou' },
  { code: '420800', name: '荆门市', province: '湖北', pinyin: 'jingmen' },
  { code: '420900', name: '孝感市', province: '湖北', pinyin: 'xiaogan' },
  { code: '421000', name: '荆州市', province: '湖北', pinyin: 'jingzhou' },
  { code: '421100', name: '黄冈市', province: '湖北', pinyin: 'huanggang' },
  { code: '421200', name: '咸宁市', province: '湖北', pinyin: 'xianning' },
  { code: '421300', name: '随州市', province: '湖北', pinyin: 'suizhou' },
  { code: '422800', name: '恩施州', province: '湖北', pinyin: 'enshi' },

  // 山东省
  { code: '370100', name: '济南市', province: '山东', pinyin: 'jinan' },
  { code: '370200', name: '青岛市', province: '山东', pinyin: 'qingdao' },
  { code: '370300', name: '淄博市', province: '山东', pinyin: 'zibo' },
  { code: '370400', name: '枣庄市', province: '山东', pinyin: 'zaozhuang' },
  { code: '370500', name: '东营市', province: '山东', pinyin: 'dongying' },
  { code: '370600', name: '烟台市', province: '山东', pinyin: 'yantai' },
  { code: '370700', name: '潍坊市', province: '山东', pinyin: 'weifang' },
  { code: '370800', name: '济宁市', province: '山东', pinyin: 'jining' },
  { code: '370900', name: '泰安市', province: '山东', pinyin: 'taian' },
  { code: '371000', name: '威海市', province: '山东', pinyin: 'weihai' },
  { code: '371100', name: '日照市', province: '山东', pinyin: 'rizhao' },
  { code: '371300', name: '临沂市', province: '山东', pinyin: 'linyi' },
  { code: '371400', name: '德州市', province: '山东', pinyin: 'dezhou' },
  { code: '371500', name: '聊城市', province: '山东', pinyin: 'liaocheng' },
  { code: '371600', name: '滨州市', province: '山东', pinyin: 'binzhou' },
  { code: '371700', name: '菏泽市', province: '山东', pinyin: 'heze' },

  // 河南省
  { code: '410100', name: '郑州市', province: '河南', pinyin: 'zhengzhou' },
  { code: '410200', name: '开封市', province: '河南', pinyin: 'kaifeng' },
  { code: '410300', name: '洛阳市', province: '河南', pinyin: 'luoyang' },
  { code: '410400', name: '平顶山市', province: '河南', pinyin: 'pingdingshan' },
  { code: '410500', name: '安阳市', province: '河南', pinyin: 'anyang' },
  { code: '410600', name: '鹤壁市', province: '河南', pinyin: 'hebi' },
  { code: '410700', name: '新乡市', province: '河南', pinyin: 'xinxiang' },
  { code: '410800', name: '焦作市', province: '河南', pinyin: 'jiaozuo' },
  { code: '410900', name: '濮阳市', province: '河南', pinyin: 'puyang' },
  { code: '411000', name: '许昌市', province: '河南', pinyin: 'xuchang' },
  { code: '411100', name: '漯河市', province: '河南', pinyin: 'luohe' },
  { code: '411200', name: '三门峡市', province: '河南', pinyin: 'sanmenxia' },
  { code: '411300', name: '南阳市', province: '河南', pinyin: 'nanyang' },
  { code: '411400', name: '商丘市', province: '河南', pinyin: 'shangqiu' },
  { code: '411500', name: '信阳市', province: '河南', pinyin: 'xinyang' },
  { code: '411600', name: '周口市', province: '河南', pinyin: 'zhoukou' },
  { code: '411700', name: '驻马店市', province: '河南', pinyin: 'zhumadian' },
  { code: '419001', name: '济源市', province: '河南', pinyin: 'jiyuan' },

  // 陕西省
  { code: '610100', name: '西安市', province: '陕西', pinyin: 'xian' },
  { code: '610200', name: '铜川市', province: '陕西', pinyin: 'tongchuan' },
  { code: '610300', name: '宝鸡市', province: '陕西', pinyin: 'baoji' },
  { code: '610400', name: '咸阳市', province: '陕西', pinyin: 'xianyang' },
  { code: '610500', name: '渭南市', province: '陕西', pinyin: 'weinan' },
  { code: '610600', name: '延安市', province: '陕西', pinyin: 'yanan' },
  { code: '610700', name: '汉中市', province: '陕西', pinyin: 'hanzhong' },
  { code: '610800', name: '榆林市', province: '陕西', pinyin: 'yulin' },
  { code: '610900', name: '安康市', province: '陕西', pinyin: 'ankang' },
  { code: '611000', name: '商洛市', province: '陕西', pinyin: 'shangluo' },

  // 福建省
  { code: '350100', name: '福州市', province: '福建', pinyin: 'fuzhou' },
  { code: '350200', name: '厦门市', province: '福建', pinyin: 'xiamen' },
  { code: '350300', name: '莆田市', province: '福建', pinyin: 'putian' },
  { code: '350400', name: '三明市', province: '福建', pinyin: 'sanming' },
  { code: '350500', name: '泉州市', province: '福建', pinyin: 'quanzhou' },
  { code: '350600', name: '漳州市', province: '福建', pinyin: 'zhangzhou' },
  { code: '350700', name: '南平市', province: '福建', pinyin: 'nanping' },
  { code: '350800', name: '龙岩市', province: '福建', pinyin: 'longyan' },
  { code: '350900', name: '宁德市', province: '福建', pinyin: 'ningde' },

  // 湖南省
  { code: '430100', name: '长沙市', province: '湖南', pinyin: 'changsha' },
  { code: '430200', name: '株洲市', province: '湖南', pinyin: 'zhuzhou' },
  { code: '430300', name: '湘潭市', province: '湖南', pinyin: 'xiangtan' },
  { code: '430400', name: '衡阳市', province: '湖南', pinyin: 'hengyang' },
  { code: '430500', name: '邵阳市', province: '湖南', pinyin: 'shaoyang' },
  { code: '430600', name: '岳阳市', province: '湖南', pinyin: 'yueyang' },
  { code: '430700', name: '常德市', province: '湖南', pinyin: 'changde' },
  { code: '430800', name: '张家界市', province: '湖南', pinyin: 'zhangjiajie' },
  { code: '430900', name: '益阳市', province: '湖南', pinyin: 'yangyang' },
  { code: '431000', name: '郴州市', province: '湖南', pinyin: 'chenzhou' },
  { code: '431100', name: '永州市', province: '湖南', pinyin: 'yongzhou' },
  { code: '431200', name: '怀化市', province: '湖南', pinyin: 'huaihua' },
  { code: '431300', name: '娄底市', province: '湖南', pinyin: 'loudi' },
  { code: '433100', name: '湘西州', province: '湖南', pinyin: 'xiangxi' },

  // 安徽省
  { code: '340100', name: '合肥市', province: '安徽', pinyin: 'hefei' },
  { code: '340200', name: '芜湖市', province: '安徽', pinyin: 'wuhu' },
  { code: '340300', name: '蚌埠市', province: '安徽', pinyin: 'bengbu' },
  { code: '340400', name: '淮南市', province: '安徽', pinyin: 'huainan' },
  { code: '340500', name: '马鞍山市', province: '安徽', pinyin: 'maanshan' },
  { code: '340600', name: '淮北市', province: '安徽', pinyin: 'huaibei' },
  { code: '340700', name: '铜陵市', province: '安徽', pinyin: 'tongling' },
  { code: '340800', name: '安庆市', province: '安徽', pinyin: 'anqing' },
  { code: '341000', name: '黄山市', province: '安徽', pinyin: 'huangshan' },
  { code: '341100', name: '滁州市', province: '安徽', pinyin: 'chuzhou' },
  { code: '341200', name: '阜阳市', province: '安徽', pinyin: 'fuyang' },
  { code: '341300', name: '宿州市', province: '安徽', pinyin: 'suzhou' },
  { code: '341500', name: '六安市', province: '安徽', pinyin: 'luan' },
  { code: '341600', name: '亳州市', province: '安徽', pinyin: 'bozhou' },
  { code: '341700', name: '池州市', province: '安徽', pinyin: 'chizhou' },
  { code: '341800', name: '宣城市', province: '安徽', pinyin: 'xuancheng' },

  // 河北省
  { code: '130100', name: '石家庄市', province: '河北', pinyin: 'shijiazhuang' },
  { code: '130200', name: '唐山市', province: '河北', pinyin: 'tangshan' },
  { code: '130300', name: '秦皇岛市', province: '河北', pinyin: 'qinhuangdao' },
  { code: '130400', name: '邯郸市', province: '河北', pinyin: 'handan' },
  { code: '130500', name: '邢台市', province: '河北', pinyin: 'xing tai' },
  { code: '130600', name: '保定市', province: '河北', pinyin: 'baoding' },
  { code: '130700', name: '张家口市', province: '河北', pinyin: 'zhangjiakou' },
  { code: '130800', name: '承德市', province: '河北', pinyin: 'chengde' },
  { code: '130900', name: '沧州市', province: '河北', pinyin: 'cangzhou' },
  { code: '131000', name: '廊坊市', province: '河北', pinyin: 'langfang' },
  { code: '131100', name: '衡水市', province: '河北', pinyin: 'hengshui' },

  // 辽宁省
  { code: '210100', name: '沈阳市', province: '辽宁', pinyin: 'shenyang' },
  { code: '210200', name: '大连市', province: '辽宁', pinyin: 'dalian' },
  { code: '210300', name: '鞍山市', province: '辽宁', pinyin: 'anshan' },
  { code: '210400', name: '抚顺市', province: '辽宁', pinyin: 'fushun' },
  { code: '210500', name: '本溪市', province: '辽宁', pinyin: 'benxi' },
  { code: '210600', name: '丹东市', province: '辽宁', pinyin: 'dandong' },
  { code: '210700', name: '锦州市', province: '辽宁', pinyin: 'jinzhou' },
  { code: '210800', name: '营口市', province: '辽宁', pinyin: 'yingkou' },
  { code: '210900', name: '阜新市', province: '辽宁', pinyin: 'fuxin' },
  { code: '211000', name: '辽阳市', province: '辽宁', pinyin: 'liaoyang' },
  { code: '211100', name: '盘锦市', province: '辽宁', pinyin: 'panjin' },
  { code: '211200', name: '铁岭市', province: '辽宁', pinyin: 'tieling' },
  { code: '211300', name: '朝阳市', province: '辽宁', pinyin: 'chaoyang' },
  { code: '211400', name: '葫芦岛市', province: '辽宁', pinyin: 'huludao' },

  // 吉林省
  { code: '220100', name: '长春市', province: '吉林', pinyin: 'changchun' },
  { code: '220200', name: '吉林市', province: '吉林', pinyin: 'jilin' },
  { code: '220300', name: '四平市', province: '吉林', pinyin: 'siping' },
  { code: '220400', name: '辽源市', province: '吉林', pinyin: 'liaoyuan' },
  { code: '220500', name: '通化市', province: '吉林', pinyin: 'tonghua' },
  { code: '220600', name: '白山市', province: '吉林', pinyin: 'baishan' },
  { code: '220700', name: '松原市', province: '吉林', pinyin: 'songyuan' },
  { code: '220800', name: '白城市', province: '吉林', pinyin: 'baicheng' },
  { code: '222400', name: '延边州', province: '吉林', pinyin: 'yanbian' },

  // 黑龙江省
  { code: '230100', name: '哈尔滨市', province: '黑龙江', pinyin: 'haerbin' },
  { code: '230200', name: '齐齐哈尔市', province: '黑龙江', pinyin: 'qiqihaer' },
  { code: '230300', name: '鸡西市', province: '黑龙江', pinyin: 'jixi' },
  { code: '230400', name: '鹤岗市', province: '黑龙江', pinyin: 'hegang' },
  { code: '230500', name: '双鸭山市', province: '黑龙江', pinyin: 'shuangyashan' },
  { code: '230600', name: '大庆市', province: '黑龙江', pinyin: 'daqing' },
  { code: '230700', name: '伊春市', province: '黑龙江', pinyin: 'yichun' },
  { code: '230800', name: '佳木斯市', province: '黑龙江', pinyin: 'jiamusi' },
  { code: '230900', name: '七台河市', province: '黑龙江', pinyin: 'qitaihe' },
  { code: '231000', name: '牡丹江市', province: '黑龙江', pinyin: 'mudanjiang' },
  { code: '231100', name: '黑河市', province: '黑龙江', pinyin: 'heihe' },
  { code: '231200', name: '绥化市', province: '黑龙江', pinyin: 'suihua' },
  { code: '232700', name: '大兴安岭地区', province: '黑龙江', pinyin: 'daxinganling' },

  // 山西省
  { code: '140100', name: '太原市', province: '山西', pinyin: 'taiyuan' },
  { code: '140200', name: '大同市', province: '山西', pinyin: 'datong' },
  { code: '140300', name: '阳泉市', province: '山西', pinyin: 'yangquan' },
  { code: '140400', name: '长治市', province: '山西', pinyin: 'changzhi' },
  { code: '140500', name: '晋城市', province: '山西', pinyin: 'jincheng' },
  { code: '140600', name: '朔州市', province: '山西', pinyin: 'shuozhou' },
  { code: '140700', name: '晋中市', province: '山西', pinyin: 'jinzhong' },
  { code: '140800', name: '运城市', province: '山西', pinyin: 'uncheng' },
  { code: '140900', name: '忻州市', province: '山西', pinyin: 'xinzhou' },
  { code: '141000', name: '临汾市', province: '山西', pinyin: 'linfen' },
  { code: '141100', name: '吕梁市', province: '山西', pinyin: 'lvliang' },

  // 江西省
  { code: '360100', name: '南昌市', province: '江西', pinyin: 'nanchang' },
  { code: '360200', name: '景德镇市', province: '江西', pinyin: 'jingdezhen' },
  { code: '360300', name: '萍乡市', province: '江西', pinyin: 'pingxiang' },
  { code: '360400', name: '九江市', province: '江西', pinyin: 'jiujiang' },
  { code: '360500', name: '新余市', province: '江西', pinyin: 'xinyu' },
  { code: '360600', name: '鹰潭市', province: '江西', pinyin: 'yingtan' },
  { code: '360700', name: '赣州市', province: '江西', pinyin: 'ganzhou' },
  { code: '360800', name: '吉安市', province: '江西', pinyin: 'jian' },
  { code: '360900', name: '宜春市', province: '江西', pinyin: 'yichun' },
  { code: '361000', name: '抚州市', province: '江西', pinyin: 'fuzhou' },
  { code: '361100', name: '上饶市', province: '江西', pinyin: 'shangrao' },

  // 云南省
  { code: '530100', name: '昆明市', province: '云南', pinyin: 'kunming' },
  { code: '530300', name: '曲靖市', province: '云南', pinyin: 'qujing' },
  { code: '530400', name: '玉溪市', province: '云南', pinyin: 'yuxi' },
  { code: '530500', name: '保山市', province: '云南', pinyin: 'baoshan' },
  { code: '530600', name: '昭通市', province: '云南', pinyin: 'zhaotong' },
  { code: '530700', name: '丽江市', province: '云南', pinyin: 'lijiang' },
  { code: '530800', name: '普洱市', province: '云南', pinyin: 'puer' },
  { code: '530900', name: '临沧市', province: '云南', pinyin: 'lincang' },
  { code: '532300', name: '楚雄州', province: '云南', pinyin: 'chuxiong' },
  { code: '532500', name: '红河州', province: '云南', pinyin: 'honghe' },
  { code: '532600', name: '文山州', province: '云南', pinyin: 'wenshan' },
  { code: '532800', name: '西双版纳州', province: '云南', pinyin: 'xishuangbanna' },
  { code: '532900', name: '大理州', province: '云南', pinyin: 'dali' },
  { code: '533100', name: '德宏州', province: '云南', pinyin: 'dehong' },
  { code: '533300', name: '怒江州', province: '云南', pinyin: 'nujiang' },
  { code: '533400', name: '迪庆州', province: '云南', pinyin: 'diqing' },

  // 贵州省
  { code: '520100', name: '贵阳市', province: '贵州', pinyin: 'guiyang' },
  { code: '520200', name: '六盘水市', province: '贵州', pinyin: 'liupanshui' },
  { code: '520300', name: '遵义市', province: '贵州', pinyin: 'zunyi' },
  { code: '520400', name: '安顺市', province: '贵州', pinyin: 'anshun' },
  { code: '520500', name: '毕节市', province: '贵州', pinyin: 'bijie' },
  { code: '520600', name: '铜仁市', province: '贵州', pinyin: 'tongren' },
  { code: '522300', name: '黔西南州', province: '贵州', pinyin: 'qianxinan' },
  { code: '522600', name: '黔东南州', province: '贵州', pinyin: 'qiandongnan' },
  { code: '522700', name: '黔南州', province: '贵州', pinyin: 'qiannan' },

  // 广西壮族自治区
  { code: '450100', name: '南宁市', province: '广西', pinyin: 'nanning' },
  { code: '450200', name: '柳州市', province: '广西', pinyin: 'liuzhou' },
  { code: '450300', name: '桂林市', province: '广西', pinyin: 'guilin' },
  { code: '450400', name: '梧州市', province: '广西', pinyin: 'wuzhou' },
  { code: '450500', name: '北海市', province: '广西', pinyin: 'beihai' },
  { code: '450600', name: '防城港市', province: '广西', pinyin: 'fangchenggang' },
  { code: '450700', name: '钦州市', province: '广西', pinyin: 'qinzhou' },
  { code: '450800', name: '贵港市', province: '广西', pinyin: 'guigang' },
  { code: '450900', name: '玉林市', province: '广西', pinyin: 'yulin' },
  { code: '451000', name: '百色市', province: '广西', pinyin: 'baise' },
  { code: '451100', name: '贺州市', province: '广西', pinyin: 'hezhou' },
  { code: '451200', name: '河池市', province: '广西', pinyin: 'hechi' },
  { code: '451300', name: '来宾市', province: '广西', pinyin: 'laibin' },
  { code: '451400', name: '崇左市', province: '广西', pinyin: 'chongzuo' },

  // 海南省
  { code: '460100', name: '海口市', province: '海南', pinyin: 'haikou' },
  { code: '460200', name: '三亚市', province: '海南', pinyin: 'sanya' },
  { code: '460300', name: '三沙市', province: '海南', pinyin: 'sansha' },
  { code: '469001', name: '儋州市', province: '海南', pinyin: 'danzhou' },

  // 内蒙古自治区
  { code: '150100', name: '呼和浩特市', province: '内蒙古', pinyin: 'huhehaote' },
  { code: '150200', name: '包头市', province: '内蒙古', pinyin: 'baotou' },
  { code: '150300', name: '乌海市', province: '内蒙古', pinyin: 'wuhai' },
  { code: '150400', name: '赤峰市', province: '内蒙古', pinyin: 'chifeng' },
  { code: '150500', name: '通辽市', province: '内蒙古', pinyin: 'tongliao' },
  { code: '150600', name: '鄂尔多斯市', province: '内蒙古', pinyin: 'eerduosi' },
  { code: '150700', name: '呼伦贝尔市', province: '内蒙古', pinyin: 'hulunbeier' },
  { code: '150800', name: '巴彦淖尔市', province: '内蒙古', pinyin: 'bayannaoer' },
  { code: '150900', name: '乌兰察布市', province: '内蒙古', pinyin: 'wulan chabu' },
  { code: '152200', name: '兴安盟', province: '内蒙古', pinyin: 'xingan meng' },
  { code: '152500', name: '锡林郭勒盟', province: '内蒙古', pinyin: 'xilinguole meng' },
  { code: '152900', name: '阿拉善盟', province: '内蒙古', pinyin: 'alashan meng' },

  // 宁夏回族自治区
  { code: '640100', name: '银川市', province: '宁夏', pinyin: 'yinchuan' },
  { code: '640200', name: '石嘴山市', province: '宁夏', pinyin: 'shizuishan' },
  { code: '640300', name: '吴忠市', province: '宁夏', pinyin: 'wuzhong' },
  { code: '640400', name: '固原市', province: '宁夏', pinyin: 'guyuan' },
  { code: '640500', name: '中卫市', province: '宁夏', pinyin: 'zhongwei' },

  // 新疆维吾尔自治区
  { code: '650100', name: '乌鲁木齐市', province: '新疆', pinyin: 'wulumuqi' },
  { code: '650200', name: '克拉玛依市', province: '新疆', pinyin: 'kelamayi' },
  { code: '650400', name: '吐鲁番市', province: '新疆', pinyin: 'tulufan' },
  { code: '650500', name: '哈密市', province: '新疆', pinyin: 'hami' },
  { code: '652300', name: '昌吉州', province: '新疆', pinyin: 'changji' },
  { code: '652700', name: '博尔塔拉州', province: '新疆', pinyin: 'boertala' },
  { code: '652800', name: '巴音郭楞州', province: '新疆', pinyin: 'bayinguoleng' },
  { code: '652900', name: '阿克苏地区', province: '新疆', pinyin: 'akesu' },
  { code: '653000', name: '克孜勒苏柯尔克孜自治州', province: '新疆', pinyin: 'kezilesu' },
  { code: '653100', name: '喀什地区', province: '新疆', pinyin: 'kashi' },
  { code: '653200', name: '和田地区', province: '新疆', pinyin: 'hetian' },
  { code: '654000', name: '伊犁哈萨克自治州', province: '新疆', pinyin: 'yili' },
  { code: '654200', name: '塔城地区', province: '新疆', pinyin: 'tacheng' },
  { code: '654300', name: '阿勒泰地区', province: '新疆', pinyin: 'aletai' },

  // 西藏自治区
  { code: '540100', name: '拉萨市', province: '西藏', pinyin: 'lasa' },
  { code: '540200', name: '日喀则市', province: '西藏', pinyin: 'rikaze' },
  { code: '540300', name: '昌都市', province: '西藏', pinyin: 'changdu' },
  { code: '540400', name: '林芝市', province: '西藏', pinyin: 'linzhi' },
  { code: '540500', name: '山南市', province: '西藏', pinyin: 'shannan' },
  { code: '542400', name: '那曲市', province: '西藏', pinyin: 'naqu' },
  { code: '542500', name: '阿里地区', province: '西藏', pinyin: 'ali' },

  // 青海省
  { code: '630100', name: '西宁市', province: '青海', pinyin: 'xining' },
  { code: '630200', name: '海东市', province: '青海', pinyin: 'haidong' },
  { code: '632200', name: '海北州', province: '青海', pinyin: 'haibei' },
  { code: '632300', name: '黄南州', province: '青海', pinyin: 'huangnan' },
  { code: '632500', name: '海南州', province: '青海', pinyin: 'hainan' },
  { code: '632600', name: '果洛州', province: '青海', pinyin: 'guoluo' },
  { code: '632700', name: '玉树州', province: '青海', pinyin: 'yushu' },
  { code: '632800', name: '海西州', province: '青海', pinyin: 'haixi' },

  // 甘肃省
  { code: '620100', name: '兰州市', province: '甘肃', pinyin: 'lanzhou' },
  { code: '620200', name: '嘉峪关市', province: '甘肃', pinyin: 'jiayuguan' },
  { code: '620300', name: '金昌市', province: '甘肃', pinyin: 'jinchang' },
  { code: '620400', name: '白银市', province: '甘肃', pinyin: 'baiyin' },
  { code: '620500', name: '天水市', province: '甘肃', pinyin: 'tianshui' },
  { code: '620600', name: '武威市', province: '甘肃', pinyin: 'wuwei' },
  { code: '620700', name: '张掖市', province: '甘肃', pinyin: 'zhangye' },
  { code: '620800', name: '平凉市', province: '甘肃', pinyin: 'pingliang' },
  { code: '620900', name: '酒泉市', province: '甘肃', pinyin: 'jiuquan' },
  { code: '621000', name: '庆阳市', province: '甘肃', pinyin: 'qingyang' },
  { code: '621100', name: '定西市', province: '甘肃', pinyin: 'dingxi' },
  { code: '621200', name: '陇南市', province: '甘肃', pinyin: 'longnan' },
  { code: '622900', name: '临夏州', province: '甘肃', pinyin: 'linxia' },
  { code: '623000', name: '甘南州', province: '甘肃', pinyin: 'gannan' }
];

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    selectedMethod: 'auto',
    locating: false,
    locatedCity: null,
    
    // 搜索相关
    searchKeyword: '',
    searchResults: [],
    selectedCity: null,
    
    // 热门城市
    hotCities: HOT_CITIES,

    // 图标路径
    locationIcon: '/assets/images/location.png',
    searchIcon: 'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la/icons/search.png'
  },

  lifetimes: {
    attached() {
      // 尝试从全局获取图标路径
      const app = getApp();
      if (app && app.globalData && app.globalData.imagePaths && app.globalData.imagePaths.icons) {
        this.setData({
          locationIcon: app.globalData.imagePaths.icons.location || '/assets/images/location.png',
          searchIcon: app.globalData.imagePaths.icons.search || 'https://636c-cloud1-d4gfy27bn0f3f5346-1432191043.tcb.qcloud.la/icons/search.png'
        });
      }
    }
  },

  observers: {
    'show': function(show) {
      if (show) {
        this.setData({
          selectedMethod: 'auto',
          locatedCity: null,
          searchKeyword: '',
          searchResults: [],
          selectedCity: null,
          locating: false
        });
      }
    }
  },

  methods: {
    // 选择定位方式
    selectMethod(e) {
      const method = e.currentTarget.dataset.method;
      this.setData({ 
        selectedMethod: method
      });
    },

    // 自动定位
    async autoLocate() {
      if (this.data.locating) return;
      
      this.setData({ locating: true, locatedCity: null, selectedCity: null });

      try {
        const res = await wx.getLocation({ type: 'gcj02' });
        
        // 调用逆地理编码获取城市信息
        const result = await this.reverseGeocode(res.latitude, res.longitude);
        
        if (result.success) {
          this.setData({
            locatedCity: result.cityData,
            locating: false
          });
          
          wx.showToast({ title: '定位成功', icon: 'success' });
        } else {
          throw new Error(result.error || '定位失败');
        }
      } catch (err) {
        console.error('自动定位失败:', err);
        this.setData({ locating: false });
        
        let msg = '无法获取位置';
        if (err.errMsg && err.errMsg.includes('auth')) {
          msg = '请先授权位置权限';
        }
        
        wx.showModal({
          title: '定位失败',
          content: `${msg}，请尝试搜索选择城市`,
          showCancel: false,
          success: () => {
            this.setData({ selectedMethod: 'search' });
          }
        });
      }
    },

    // 逆地理编码（调用云函数）
    async reverseGeocode(latitude, longitude) {
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'userLogin',
          data: {
            action: 'reverseGeocode',
            latitude,
            longitude
          }
        });

        if (result.success) {
          return {
            success: true,
            cityData: {
              country: result.country,
              countryCode: result.countryCode,
              region: result.region,
              city: result.city,
              cityCode: result.cityCode,
              isDomestic: result.isDomestic,
              source: 'auto'
            }
          };
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('逆地理编码失败:', err);
        return { success: false, error: err.message };
      }
    },

    // 搜索输入
    onSearchInput(e) {
      const keyword = e.detail.value.trim();
      this.setData({ searchKeyword: keyword });
      
      if (keyword.length > 0) {
        this.performSearch(keyword);
      } else {
        this.setData({ searchResults: [] });
      }
    },

    // 执行搜索
    performSearch(keyword) {
      if (!keyword) {
        this.setData({ searchResults: [] });
        return;
      }

      const results = ALL_CITIES.filter(city => {
        // 支持中文和拼音搜索
        const nameMatch = city.name.includes(keyword);
        const provinceMatch = city.province.includes(keyword);
        const pinyinMatch = city.pinyin.toLowerCase().includes(keyword.toLowerCase());
        return nameMatch || provinceMatch || pinyinMatch;
      }).slice(0, 15); // 限制结果数量

      this.setData({ searchResults: results });
    },

    // 清除搜索
    clearSearch() {
      this.setData({ 
        searchKeyword: '', 
        searchResults: [],
        selectedCity: null
      });
    },

  // 选择搜索结果
  selectSearchResult(e) {
    const dataset = e.currentTarget.dataset;
    const code = dataset.code;
    const name = dataset.name;
    const province = dataset.province;
    
    console.log('选择搜索城市:', { code, name, province });

    // 构造城市数据
    const cityData = {
      country: '中国',
      countryCode: 'CN',
      region: province,
      city: name.replace('市', ''),
      cityCode: code,
      isDomestic: true,
      source: 'search'
    };

    this.setData({ selectedCity: cityData });

    // 触发震动反馈
    wx.vibrateShort({ type: 'light' });
  },

  // 选择热门城市
  selectHotCity(e) {
    const dataset = e.currentTarget.dataset;
    const code = dataset.code;
    const name = dataset.name;
    const province = dataset.province;
    
    console.log('选择热门城市:', { code, name, province });

    // 构造城市数据
    const cityData = {
      country: '中国',
      countryCode: 'CN',
      region: province,
      city: name.replace('市', ''),
      cityCode: code,
      isDomestic: true,
      source: 'search'
    };

    this.setData({ selectedCity: cityData });

    // 触发震动反馈
    wx.vibrateShort({ type: 'light' });
  },

  // 确认选择
  onConfirm() {
    const { selectedMethod, locatedCity, selectedCity } = this.data;
    
    let result;
    
    // 优先使用已选中的城市（无论是哪种方式选择的）
    if (selectedCity) {
      result = selectedCity;
    } else if (locatedCity) {
      result = locatedCity;
    } else {
      if (selectedMethod === 'auto') {
        wx.showToast({ title: '请先定位或切换到搜索模式', icon: 'none' });
      } else {
        wx.showToast({ title: '请选择一个城市', icon: 'none' });
      }
      return;
    }
    
    this.triggerEvent('confirm', result);
  },

  // 取消
  onCancel() {
    this.triggerEvent('cancel');
  },

  // 点击遮罩
  onMaskTap() {
    this.onCancel();
  },

  // 阻止冒泡
  onContentTap() {
    // 什么都不做，只是阻止冒泡
  }
},

computed: {
  selectedText() {
    const { locatedCity, selectedCity } = this.data;
    
    // 优先显示选中的城市
    if (selectedCity) {
      return `${selectedCity.region} ${selectedCity.city}`;
    }
    if (locatedCity) {
      return `${locatedCity.region} ${locatedCity.city}`;
    }
    return '';
  }
}
});