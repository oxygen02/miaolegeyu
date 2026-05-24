# 云数据库权限配置指南

## 配置入口

1. 打开微信开发者工具
2. 点击顶部「云开发」按钮
3. 进入「数据库」标签
4. 点击对应集合名称 →「权限设置」→「自定义安全规则」

---

## 1. users 集合（用户表）

### 推荐权限规则

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

### 说明

| 场景 | 权限控制 |
|------|----------|
| 用户查看自己的资料 | ✅ 允许（只能读自己的） |
| 用户修改自己的昵称/头像 | ✅ 允许（只能改自己的） |
| 用户查看别人的资料 | ❌ 禁止（保护隐私） |
| 管理员查看所有用户 | ✅ 允许（通过云函数绕过权限） |
| 管理员封禁用户 | ✅ 允许（通过云函数绕过权限） |

> **重要**：所有管理员操作都通过云函数执行，云函数属于「管理端」，不受此权限限制。

### 替代方案（如需展示用户昵称头像）

如果业务需要在页面展示其他用户的昵称和头像，可以放宽读权限：

```json
{
  "read": true,
  "write": "auth.openid == doc._openid"
}
```

但这样所有用户都能看到完整的用户列表，建议仅在必要时使用。

---

## 2. config 集合（配置表）

### 推荐权限规则

```json
{
  "read": false,
  "write": false
}
```

### 说明

| 场景 | 权限控制 |
|------|----------|
| 小程序端读取 | ❌ 禁止（敏感配置） |
| 小程序端修改 | ❌ 禁止 |
| 云函数读取 | ✅ 允许（管理端绕过权限） |
| 云函数修改 | ✅ 允许（管理端绕过权限） |
| 控制台查看 | ✅ 允许 |

### 为什么全部禁止？

- 存储管理员 openid 列表
- 可能存储其他敏感配置（如 API 密钥、开关标志）
- 只允许云函数和管理端访问

---

## 3. reports 集合（举报表）

### 推荐权限规则

```json
{
  "read": "auth.openid == doc.reporterOpenId",
  "write": "auth.openid == doc.reporterOpenId"
}
```

### 说明

| 场景 | 权限控制 |
|------|----------|
| 用户查看自己提交的举报 | ✅ 允许 |
| 用户提交新举报 | ✅ 允许 |
| 用户查看别人的举报 | ❌ 禁止 |
| 用户修改别人的举报 | ❌ 禁止 |
| 管理员查看所有举报 | ✅ 允许（通过云函数） |
| 管理员处理举报 | ✅ 允许（通过云函数） |

---

## 4. admin_logs 集合（管理员操作日志）

### 推荐权限规则

```json
{
  "read": false,
  "write": false
}
```

### 说明

| 场景 | 权限控制 |
|------|----------|
| 小程序端读取 | ❌ 禁止 |
| 小程序端写入 | ❌ 禁止 |
| 云函数写入日志 | ✅ 允许（管理端绕过权限） |
| 控制台查看日志 | ✅ 允许 |

---

## 5. 其他业务集合参考

### rooms（投票房间）

```json
{
  "read": true,
  "write": "auth.openid == doc.creatorOpenId"
}
```

### shops（店铺）

```json
{
  "read": true,
  "write": "auth.openid == doc.creatorOpenId"
}
```

### schedule_votes（时间投票）

```json
{
  "read": true,
  "write": "auth.openid == doc.creatorOpenId"
}
```

---

## 快速配置步骤

### 方式一：控制台手动配置（推荐）

1. 打开「云开发控制台」→「数据库」
2. 找到 `users` 集合，点击「权限设置」
3. 选择「自定义安全规则」
4. 粘贴对应的 JSON 规则
5. 点击「确定」保存
6. 对其他集合重复上述步骤

### 方式二：使用云函数批量初始化

如果集合还没有创建，可以用云函数创建并设置权限：

```javascript
// 在小程序端执行
wx.cloud.callFunction({
  name: 'initDatabase'
}).then(res => {
  console.log('数据库初始化完成', res);
});
```

> 注意：集合创建后，权限仍需在控制台手动设置。

---

## 常见问题

### Q1: 设置了 "read": false，云函数还能读吗？

**可以**。云函数属于「管理端」，拥有所有读写权限，不受安全规则限制。

### Q2: 用户怎么查看其他用户的昵称？

有两种方案：

**方案A**：放宽 users 集合读权限为 `true`（适合公开信息）

**方案B（推荐）**：在业务数据中冗余存储用户昵称，如 rooms 集合中存储 `creatorName` 字段，而不是前端去查 users 集合。

### Q3: 为什么 reports 要允许用户读自己的？

这样用户可以在「举报中心」查看自己提交的举报记录和处理状态，提升用户体验。

### Q4: admin_logs 完全禁止读写，那怎么查看？

只能通过「云开发控制台」→「数据库」中查看，或者另外开发一个管理后台页面通过云函数查询展示。

---

## 权限规则速查表

| 集合 | read | write | 说明 |
|------|------|-------|------|
| users | `auth.openid == doc._openid` | `auth.openid == doc._openid` | 仅自己 |
| config | `false` | `false` | 完全禁止前端访问 |
| reports | `auth.openid == doc.reporterOpenId` | `auth.openid == doc.reporterOpenId` | 仅自己的举报 |
| admin_logs | `false` | `false` | 完全禁止前端访问 |
| rooms | `true` | `auth.openid == doc.creatorOpenId` | 公开读，仅创建者写 |
| shops | `true` | `auth.openid == doc.creatorOpenId` | 公开读，仅创建者写 |
| schedule_votes | `true` | `auth.openid == doc.creatorOpenId` | 公开读，仅创建者写 |
