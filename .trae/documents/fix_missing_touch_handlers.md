# 修复缺失的触摸事件处理函数

## 问题描述
微信小程序报错：
- Component "pages/index/index" does not have a method "onTouchEnd" to handle event "touchend"
- Component "pages/index/index" does not have a method "onTouchStart" to handle event "touchstart"

## 原因分析
在 `pages/index/index.wxml` 中，四个功能卡片（发起聚餐、参与投票、鱼塘拼单、个人中心）都绑定了 `bindtouchstart="onTouchStart"` 和 `bindtouchend="onTouchEnd"` 事件，但在 `pages/index/index.js` 中没有定义对应的处理方法。

## 修复方案

### 步骤 1: 在 index.js 中添加缺失的触摸事件处理函数

需要在 Page 对象中添加以下方法：

```javascript
// 触摸开始
onTouchStart(e) {
  const { index } = e.currentTarget.dataset;
  this.setData({ touchIndex: index });
},

// 触摸结束
onTouchEnd(e) {
  this.setData({ touchIndex: null });
},

// 触摸移动（防止触摸滑动时触发点击）
onTouchMove(e) {
  this.setData({ touchIndex: null });
}
```

### 步骤 2: 在 data 中添加 touchIndex 初始值

```javascript
data: {
  recentRooms: [],
  scaredFish: null,
  scaredFishDirection: null,
  touchIndex: null  // 添加这一行
}
```

### 步骤 3: 验证 wxml 中的 data-index 绑定

确保每个功能卡片的 `data-index` 属性正确设置：
- 发起聚餐: data-index="0"
- 参与投票: data-index="1"
- 鱼塘拼单: data-index="2"
- 个人中心: data-index="3"

## 预期结果
修复后，功能卡片的触摸效果将正常工作：
- 触摸卡片时会有视觉反馈（通过 touchIndex 控制 CSS 类）
- 松开手指时视觉反馈消失
- 不会再出现 "does not have a method" 的报错
