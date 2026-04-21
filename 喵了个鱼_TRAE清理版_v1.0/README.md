# 喵了个鱼 - TRAE 清理版

## 设计原则（强制）
1. **无 emoji**：所有页面使用 CSS 图标或图片占位符
2. **动画内嵌**：所有动画已写在 app.wxss 的 @keyframes 中，页面直接引用 class
3. **严格布局**：首页 30/70 比例，投票页滑动区域 70%，底部操作区固定
4. **设计系统**：颜色/圆角/阴影使用 CSS 变量，禁止硬编码

## 文件结构
```
app.js / app.json / app.wxss          # 全局设计系统 + 动画库
pages/
  index/                               # 首页：30/70 比例，橘仔+池塘
  create/                              # 发起选择：三卡片
  create-mode-a/                         # 模式A：海报上传
  vote/                                # 投票页：滑动交互（核心）
  control/                             # 控制台：统计+结果
  result/                              # 结果页：海报+导航
  ...                                  # 其余页面待 TRAE 补全
cloudfunctions/                        # 7个云函数
utils/                                 # uuid + 平台跳转
```

## 给 TRAE 的指令
"请基于现有代码补全：
1. create-mode-b / filter / create-group-order / settlement / fish-tank / profile 页面
2. 所有页面必须使用 app.wxss 中的设计系统变量和动画类
3. 禁止添加 emoji，图标使用 CSS 绘制或 /assets/ 占位图
4. 保持与现有页面一致的卡片式布局"

## 部署
1. 导入微信开发者工具
2. 开通云开发，创建集合：rooms, participants, fish_tank
3. 部署所有云函数
4. 在 /assets/ 目录放入橘仔/鱼宝插画（PNG）
