# 喵了个鱼 - TRAE 开发文档

> **版本**: v4.2 Final  
> **日期**: 2026-04-20  
> **目标**: 微信小程序原生开发 + 微信云开发  
> **工具**: TRAE / Cursor / VS Code + 微信开发者工具

---

## 1. 项目概述

### 1.1 产品定位
熟人微信社群的聚餐决策与拼单工具。核心解决"去哪吃"和"一起点"。

### 1.2 核心原则
- **模式A（我挑好了）**: 发起者上传美团/大众点评分享海报（2-6张），成员直接看海报投票。
- **模式B（你们来定）**: 发起者未定店，成员通过抽象水彩插画卡片筛选口味偏好，发起者线下选店后上传海报确认。
- **拼单**: 上传美团外卖/京东秒送海报，成员选择参与/不参与，生成文本清单。

### 1.3 绝对不做
- 不接入美团/京东 API（无开放接口）
- 不做 OCR 识别店名
- 不做高德 POI 搜索选店（高德仅保留结果页导航）
- 不做语音功能
- 不做支付闭环
- 不做陌生人社交

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序原生 | WXML + WXSS + JS，不使用 Taro/Uni-app |
| 后端 | 微信云开发 | 云数据库 + 云函数 + 云存储 |
| 用户体系 | 匿名 UUID | `wx.getStorageSync` 存储，不获取微信头像昵称 |
| 地图 | 高德 SDK | 仅用于结果页「导航去店」 |
| 动画 | CSS3 + Lottie | 简单动画 CSS，复杂动作用 Lottie JSON |

---

## 3. 页面路由与结构

```
/pages
  /index                    # 首页：双入口「吃鱼啊」「吃啥鱼」
  /create                   # 发起者选择页：我挑好了 / 你们来定 / 拼个单
  /create-mode-a            # 模式A发起：上传海报、设置信息
  /create-mode-b            # 模式B发起：设置基础信息
  /create-group-order       # 拼单发起：上传海报、设置信息
  /vote                     # 成员投票页（模式A共用）
  /filter                   # 成员筛选页（模式B口味筛选）
  /control                  # 发起人控制台
  /result                   # 结果通知页
  /settlement               # 结算页
  /fish-tank                # 鱼塘（推荐墙）
  /profile                  # 个人中心
/components
  /poster-card              # 海报卡片组件（模式A/拼单共用）
  /filter-card              # 偏好卡片组件（模式B）
  /slide-anim               # 滑动动画组件（左滑抓痕/右滑掌印）
  /taboo-selector           # 禁忌选择组件
  /fish-tank-card           # 鱼塘鱼形卡片组件
/cloud-functions
  /createRoom               # 创建房间
  /getRoom                  # 获取房间数据
  /submitVote               # 提交投票
  /countVotes               # 统计票数（含一票否决逻辑）
  /lockRoom                 # 锁定房间
  /createFish               # 鱼塘丢鱼
  /adoptFish                # 捞入候选池
/assets
  /images                   # 橘仔/鱼宝插画、背景纹理
  /lottie                   # Lottie 动画文件
```

---

## 4. 数据库设计（云开发 Collections）

### 4.1 rooms（房间）

```javascript
{
  _id: String,                    // 自动生成的 _id
  title: String,                  // 房间标题，如"周五部门聚餐"
  mode: String,                   // enum: ['pick_for_them', 'let_them_choose', 'group_order']
  platform: String,               // enum: ['meituan', 'dianping', 'jd']，拼单时必填
  creatorOpenId: String,          // 发起人微信 OpenID
  status: String,                 // enum: ['draft', 'voting', 'locked', 'cancelled']
  candidatePosters: [{            // 候选海报数组（模式A/拼单）
    imageUrl: String,             // 云存储图片地址
    platformSource: String        // 'meituan' | 'dianping' | 'jd'
  }],
  voteDeadline: Date,             // 投票截止时间
  timeAuxiliary: Boolean,         // 是否开启时间辅助
  groupOrderOption: Boolean,      // 是否开启拼单
  finalPoster: {                  // 最终结果海报
    imageUrl: String,
    time: Date,
    address: String
  },
  createdAt: Date,
  lockedAt: Date
}
```

### 4.2 participants（参与者）

```javascript
{
  _id: String,
  roomId: String,                 // 关联 rooms._id
  uuid: String,                   // 前端生成的本地 UUID（匿名核心）
  status: String,                 // enum: ['not_opened', 'opened', 'voted', 'waived', 'leave']
  leaveInfo: {                    // 请假信息（实名）
    reason: String,               // 事由，如"加班"
    realName: String              // 微信昵称（发起人可见）
  },
  vote: {
    posterIndices: [Number],      // 模式A/拼单：右滑的海报索引数组 [0, 2]
    vetoIndices: [Number],        // 硬性禁忌排除的海报索引数组 [1]
    filterResult: {               // 模式B：口味筛选结果
      categories: [String],       // 大类，如['hotpot', 'bbq']
      subCategories: [String]     // 细类，如['chongqing_hotpot']
    },
    timestamp: Date
  },
  timeInfo: {                     // 时间辅助
    type: String,                 // 'departure' | 'arrival'
    datetime: Date
  },
  hardTaboos: [String],           // 硬性禁忌数组
  softTaboos: [String],           // 软性偏好数组
  orderItems: [{                  // 拼单需求
    name: String,                 // 商品名，如"杨枝甘露"
    remark: String                // 备注，如"少冰五分糖 不要香菜"
  }]
}
```

### 4.3 fish_tank（鱼塘）

```javascript
{
  _id: String,
  roomId: String,
  userName: String,               // 微信昵称（实名展示）
  shopName: String,               // 店名（可选）
  content: String,                // 推荐语
  emoji: String,                  // 表情标识，如'greedy_cat'
  imageUrl: String,               // 上传的海报/图片（可选）
  likes: Number,                  // 想吃附议数
  createdAt: Date,
  isAdopted: Boolean              // 是否被发起者捞入候选池
}
```

---

## 5. 核心逻辑实现

### 5.1 滑动交互（vote / filter 页面）

**实现要求**:
- 使用原生 `touchstart`, `touchmove`, `touchend`
- 单张卡片绝对定位，跟随手指移动
- 水平滑动超过屏幕宽度 **30%** 触发切换
- 左滑: 卡片 `translateX` 负向移动，旋转 `-5deg`，出现三条红色抓痕
- 右滑: 卡片 `translateX` 正向移动，旋转 `5deg`，出现樱花掌印
- 底部固定显示「撤销」条（3秒倒计时），点击后卡片复位
- 硬性禁忌触发: 左滑后弹出 `wx.showActionSheet`，选项「单纯不喜欢」「有我的硬性禁忌」

**CSS 变量**:
```css
:root {
  --color-primary: #D4652A;
  --color-primary-light: #E8913A;
  --color-hard: #C84B31;
  --color-soft: #8A8A8A;
  --color-bg: #F5F0E8;
  --color-card: #FFFDF7;
  --radius-card: 24rpx;
}
```

### 5.2 一票否决逻辑（云函数 countVotes）

```javascript
// cloud-functions/countVotes/index.js
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;

  const { data: participants } = await db.collection('participants')
    .where({ roomId, status: 'voted' })
    .get();

  const posterStats = {}; // { 0: { likes: 0, vetoes: 0 }, ... }

  participants.forEach(p => {
    // 统计赞成票
    (p.vote.posterIndices || []).forEach(idx => {
      if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
      posterStats[idx].likes++;
    });
    // 统计否决票（硬性禁忌）
    (p.vote.vetoIndices || []).forEach(idx => {
      if (!posterStats[idx]) posterStats[idx] = { likes: 0, vetoes: 0 };
      posterStats[idx].vetoes++;
    });
  });

  // 过滤: vetoes > 0 的海报不参与排序
  const validPosters = Object.entries(posterStats)
    .filter(([idx, stat]) => stat.vetoes === 0)
    .sort((a, b) => b[1].likes - a[1].likes)
    .map(([idx, stat]) => ({ index: parseInt(idx), ...stat }));

  // 被否决的海报
  const vetoedPosters = Object.entries(posterStats)
    .filter(([idx, stat]) => stat.vetoes > 0)
    .map(([idx, stat]) => ({ index: parseInt(idx), ...stat }));

  return { validPosters, vetoedPosters };
};
```

### 5.3 匿名 UUID 机制

```javascript
// app.js 或 utils/uuid.js
function getUUID() {
  let uuid = wx.getStorageSync('miaolegeyu_uuid');
  if (!uuid) {
    const arr = new Uint8Array(8);
    wx.getRandomValues(arr);
    uuid = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    wx.setStorageSync('miaolegeyu_uuid', uuid);
  }
  return uuid;
}
```

### 5.4 平台跳转

```javascript
// utils/navigate.js
const PLATFORM_APP_IDS = {
  meituan: 'wxde8ac0a21135c07d',      // 美团外卖（需开发前确认最新ID）
  dianping: 'wxc0d6fdfa1c166f6c',     // 大众点评（需确认）
  jd: 'wx91d27dbf599dff74'             // 京东秒送（需确认）
};

function goToPlatform(platform) {
  const appId = PLATFORM_APP_IDS[platform];
  if (!appId) return;
  wx.navigateToMiniProgram({
    appId,
    path: 'pages/index/index',          // 不带参跳转首页，用户自行搜索
    extraData: { from: 'miaolegeyu' },
    fail: () => wx.showToast({ title: '跳转失败', icon: 'none' })
  });
}
```

---

## 6. 视觉规范

### 6.1 色彩系统

| 用途 | 色值 | 使用场景 |
|------|------|---------|
| 主色（暗橘） | `#D4652A` | 主按钮、选中状态、掌印光晕 |
| 主色亮 | `#E8913A` | 点缀、高亮 |
| 辅色（深海蓝） | `#4A7C8C` | 橘仔项圈、水色暗部 |
| 水色 | `#A8D8EA` | 池塘波纹 |
| 背景（纸） | `#F5F0E8` | 页面背景，带细微纸张纹理 |
| 卡片纸 | `#FFFDF7` | 卡片背景 |
| 硬性禁忌 | `#C84B31` | 红色边框、抓痕、印章 |
| 软性偏好 | `#8A8A8A` | 灰色边框、次要文字 |
| 文字主色 | `#3D3D3D` | 标题、正文 |
| 文字次要 | `#8A8A8A` | 说明文字 |

### 6.2 字体
- 不使用外部字体文件（避免包体积和加载问题）
- 系统默认栈: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- 通过 `letter-spacing: 1rpx` 和 `font-weight: 500` 模拟手写松弛感

### 6.3 卡片规范

**海报卡片（模式A/拼单）**:
- 圆角: `24rpx`
- 斜置: `0deg`（海报必须保持水平可读）
- 边框: `2rpx solid #D4652A`（蜡笔质感，可轻微不规则）
- 阴影: `0 8rpx 24rpx rgba(212, 101, 42, 0.08)`
- 平台角标: 右下角，蜡笔风格化图标（美团袋鼠/点评黑方框/京东狗）

**偏好卡片（模式B）**:
- 圆角: `24rpx`
- 斜置: `8deg`
- 背景: 水彩蜡笔插画（火锅/烧烤等抽象图案）+ 品类名称
- 边框: `2rpx solid #D4652A`

### 6.4 动画关键帧

```css
/* 左滑抓痕 */
@keyframes scratch {
  0% { opacity: 0; transform: translateX(20rpx) rotate(-10deg); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateX(-20rpx) rotate(10deg); }
}

/* 右滑掌印 */
@keyframes paw {
  0% { opacity: 0; transform: scale(0.5); }
  60% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1); }
}

/* 橘仔盖章 */
@keyframes stamp {
  0% { transform: translateY(-200rpx) scale(1.5) rotate(-15deg); }
  60% { transform: translateY(0) scale(0.9) rotate(5deg); }
  100% { transform: translateY(0) scale(1) rotate(0); }
}
```

---

## 7. 业务规则清单（开发时必须遵守）

1. **模式A**: 发起者上传 2-6 张海报（从相册选择），每张仅需点选平台来源（美团/点评/京东）。成员看到的卡片主体就是这张海报图片，**不做任何信息重建**（无OCR、无手动输入店名、无搜索）。
2. **模式B**: 仅展示抽象偏好卡片（水彩插画+文字），**无任何店铺信息、无海报**。发起者线下选店后上传最终海报确认。
3. **硬性禁忌一票否决**: 模式A中，成员左滑海报可选择「有我的硬性禁忌」，该海报进入否决池，无论得票多少不参与最终排序。
4. **拼单**: 与模式A共用海报卡片逻辑，但底部按钮为「参与」/「不参与」。多店时单选，只能选一家。
5. **鱼塘**: 房间独立标签。成员可丢鱼（文字+表情+图片），发起者在房间进入 `voting` 状态前可将鱼捞入候选池，之后只读。
6. **结算**: 默认大按钮「我来买单」，次按钮「分摊一下」，**不出现「AA」字样**。
7. **撤销**: 废弃边缘滑回，改用底部 3 秒提示条。
8. **音效**: 默认关闭，首次滑动时引导用户点击屏幕解锁音频上下文。
9. **匿名**: 投票选店绝对匿名（UUID）；请假实名；鱼塘推荐实名；拼单群内自然实名。
10. **平台跳转**: 点击「去平台看看」跳转对应平台小程序。跳转**不带店铺参数**（因无法获取），跳转平台首页，用户自行搜索店名。

---

## 8. 开发顺序（MVP 优先）

### Phase 1: 核心闭环（必须完成）
1. `pages/index` - 首页双入口 + 橘仔鱼宝静态视觉
2. `pages/create` - 发起者选择页（我挑好了/你们来定/拼个单）
3. `pages/create-mode-a` - 上传海报（wx.chooseImage）+ 标记平台来源
4. `pages/vote` - 滑动投票页（touch事件 + CSS动画）
5. `pages/control` - 发起人控制台（统计 + 定结果）
6. `pages/result` - 结果通知页（展示最终海报）
7. 云函数: `createRoom`, `getRoom`, `submitVote`, `countVotes`, `lockRoom`

### Phase 2: 体验完善
8. `pages/filter` - 模式B口味筛选（大类/细类漏斗）
9. `pages/create-mode-b` - 模式B发起页
10. `pages/create-group-order` - 拼单发起页
11. `pages/fish-tank` - 鱼塘（丢鱼 + 附议 + 捞入候选池）
12. `pages/settlement` - 结算页

### Phase 3: Polish
13. 订阅消息（`wx.requestSubscribeMessage`）
14. 偏好记忆（`wx.setStorageSync` 存禁忌）
15. 最近吃过提醒（本地缓存时间戳）
16. 趣味模式/贱贱模式开关
17. 深夜模式（深灰背景 `#1E1E1E`）

---

## 9. 注意事项

- **包体积**: 微信小程序限制 2MB（分包后 4MB）。图片上传云存储，代码中仅保留 https 地址。
- **图片上传**: 使用 `wx.cloud.uploadFile`，返回 `fileID` 和 `tempFileURL`。
- **性能**: 滑动交互使用 `transform: translateX/rotate`，避免修改 `left/top` 导致重排。
- **兼容性**: 低端机测试滑动流畅度，必要时减少动画复杂度。
- **平台 AppID**: 开发前务必到「小程序后台 → 开发 → 开发设置 → 服务器域名」配置 `request` 和 `uploadFile` 合法域名，并确认美团/点评/京东小程序的最新 AppID。

---

## 10. 文件交付清单（给设计师/产品经理）

开发前需要准备的素材：
1. 橘仔待机插画（首页，凝视池塘）
2. 橘仔表情集（wink、左滑、右滑、盖章、贱贱模式）
3. 鱼宝形象（游动、咬尾、吐泡泡）
4. 模式B偏好插画（10个大类：火锅、烧烤、中式正餐、西餐、日料、韩餐、东南亚菜、快餐、轻食、特色小吃）
5. 纸张纹理背景图（tileable，用于页面背景）
6. 平台角标图标（美团袋鼠、点评黑方框、京东狗，蜡笔风格化）
7. Lottie 文件（橘仔盖章动画，可选）

---

*本文档由产品需求讨论整理生成，可直接作为 TRAE / Cursor / VS Code 的开发基准。*
