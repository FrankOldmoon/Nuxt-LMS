%%%%% GG1
## 💬 走进小程序开发

微信小程序：**不用下载、点开就用、10 亿人的入口**。💬

这门课用 **uni-app X**（Vue 风格、一套代码多端）+ **AI Agent 结对**，从零做出一个真正能提交审核上线的微信小程序。

%%GA1%%

%%%%% X1
## 🐾 微信小程序全景

### 🆚 小程序 vs App vs 网页

| | 🐾 微信小程序 | 📱 原生 App | 🌐 网页 |
| --- | --- | --- | --- |
| 安装 | 免安装，即点即用 | 需下载安装 | 免安装 |
| 入口 | 微信内 10 亿用户 | 应用商店 | 浏览器/链接 |
| 能力 | 受限但够用（支付/登录/分享） | 最强 | 受浏览器限制 |
| 上架 | **微信审核** | 商店审核 | 无审核 |

### 🧭 为什么小程序适合课程作品

零安装成本，同学扫码就能用；班级打卡、社团报名、成绩查询这类**轻量工具**正是小程序的主场。

:::callout icon=💡
小程序的宿主是微信 —— 想清楚"用户为什么在微信里用它"，你的选题就成功了一半。
:::

%%X1A%%

%%X1B%%

%%%%% X2
## 🦄 uni-app X 是什么？

**uni-app X** 是 DCloud 的下一代跨端框架：**Vue 风格的语法**，一次开发，编译到**微信小程序、App（原生）、Web** 等多端。

### 🦄 三个关键词

- 📄 **uvue** — 页面文件（类似 Vue 的 SFC：template + script + style）
- 🎯 **UTS** — uni-app X 的语言（TypeScript 风格，编译期类型安全）
- 🔀 **条件编译** — 一套代码里为不同平台写不同逻辑（`#ifdef MP-WEIXIN`）

### ⚖️ 为什么不直接写原生小程序？

原生小程序用 WXML/WXSS/JS 三件套，语法自成一体；uni-app X 用 **Vue 语法 + 完整工程化**，学一套通多端 —— 且 AI Agent 对 Vue 语法的掌握远好于 WXML。

:::callout icon=💡
一句话定位：**用你最熟的 Vue 思维写小程序**，微信开发者工具负责预览与调试。
:::

%%X2A%%

%%X2B%%

%%%%% X3
## 🛠️ 环境搭建

### 📋 安装清单

1. 🟣 **HBuilderX** — uni-app X 官方 IDE（创建/编译 uni-app X 项目）
2. 💚 **微信开发者工具** — 小程序的预览、调试与上传（去官网下载，微信扫码登录）
3. 🆔 **小程序 AppID** — 注册微信小程序账号（个人号即可练习）获得

### 🚀 创建项目流程

```text
HBuilderX → 新建项目 → uni-app X 模板 → 填入 AppID
→ 运行到微信开发者工具（首次需在开发者工具里开启服务端口）
→ 模拟器出现页面 = 环境通了！
```

:::callout icon=⚠️
两个工具的角色分工：**HBuilderX 写代码、编译**；**微信开发者工具负责预览、调试、上传**。别在错误的地方找按钮 —— 这是最常见的新手困惑。
:::

%%X3A%%

%%X3B%%

%%%%% GG2
## 🦄 uni-app X 基础

Vue 风格的页面 + UTS 语言 + 响应式状态。🦄

学过 Vue / 本站 Web 课的话，这一组会非常亲切。

%%GA2%%

%%%%% U1
## 📄 uvue：页面结构与模板语法

```vue
<template>
  <view class="page">
    <text class="title">{{ title }}</text>
    <view v-for="(item, index) in list" :key="index">
      <text>{{ index + 1 }}. {{ item }}</text>
    </view>
    <button v-if="list.length === 0">还没有数据</button>
  </view>
</template>

<script>
export default {
  data() { return { title: '我的小程序', list: ['任务A', '任务B'] } },
}
</script>
```

### 🧭 小程序端的"标签"

- 📦 **`<view>`** ≈ 网页的 `<div>`，**`<text>`** ≈ `<span>`，**`<image>`** ≈ `<img>`
- ⚠️ 小程序里**文字必须包在 `<text>` 里**，直接写在 `<view>` 里可能不渲染 —— 经典坑！

%%U1A%%

%%U1B%%

%%%%% U2
## 🎯 UTS 语言基础

UTS 就是 TypeScript 风格的语言，会 JS 就会 UTS：

```ts
let count: number = 0            // 类型标注
const name: string = 'uni-app X'
let done: boolean = false

function add(a: number, b: number): number {
  return a + b
}

class Task {
  title: string = ''
  done: boolean = false
}
```

### 🎯 要点

- 🏷️ **类型标注**写在变量后（`let x: number`），与 TS 相同
- 🔁 **数组/对象/循环** 与 JS 一致（`for...of`、`map`、`filter`）
- 📦 类与构造器用于数据模型（打卡记录、用户信息）

:::callout icon=💡
把 UTS 当"更严格的 TS"：不确定写法时，让 Agent「把这段 TS 转成 UTS，注意 uni-app X 的类型规范」。
:::

%%U2A%%

%%U2B%%

%%%%% U3
## 🔄 响应式与页面生命周期

```vue
<script>
export default {
  data() { return { count: 0 } },
  methods: {
    add() { this.count++ }        // 响应式：数据变，界面变
  },
  onLoad(options) {               // 页面加载（可拿路由参数）
    console.log('参数', options)
  },
  onShow() {                      // 每次切回本页触发
    // 刷新数据的最佳时机
  },
}
</script>
```

### 🔄 页面生命周期速查

- 📥 **onLoad** — 页面加载一次（接收上一页传参）
- 👀 **onShow** — 每次显示（从别的页面返回也会触发）
- 📤 **onUnload** — 页面销毁

:::callout icon=⚠️
刷新数据放 onShow 还是 onLoad？**onLoad 只想跑一次的逻辑；onShow 放"回来就该刷新"的逻辑**（如打卡列表）。
:::

%%U3A%%

%%U3B%%

%%%%% U4
## 🎨 样式与布局

uni-app X 支持 CSS 子集，**flex 是主力布局**：

```css
.page {
  flex: 1;                          /* 页面根容器 */
  padding: 20rpx;                   /* rpx：屏幕自适应单位，750rpx = 屏宽 */
}
.card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-radius: 16rpx;
  background-color: #ffffff;
}
```

- 📏 **rpx** — 小程序的自适应单位：设计稿 750 宽，1px(设计稿) = 1rpx
- 🧭 flex 布局从小程序年代就是"一等公民"（不像网页还有 float 遗产）
- 🔀 **条件编译**在样式里也可用（不同平台不同样式）

%%U4A%%

%%U4B%%

%%%%% GG3
## 💚 微信小程序能力

uni 的 API 前缀是 **`uni.`**，编译到微信端自动变成对应微信能力。💚

这一组掌握导航、交互反馈与微信开放能力。

%%GA3%%

%%%%% W1
## 🧭 页面与导航

### 📄 pages.json — 小程序的"户口本"

```json
{
  "pages": [
    { "path": "pages/index/index", "style": { "navigationBarTitleText": "班级打卡" } },
    { "path": "pages/stats/stats", "style": { "navigationBarTitleText": "统计" } }
  ],
  "tabBar": {
    "list": [
      { "pagePath": "pages/index/index", "text": "打卡", "iconPath": "static/tab1.png", "selectedIconPath": "static/tab1-on.png" },
      { "pagePath": "pages/stats/stats", "text": "统计", "iconPath": "static/tab2.png", "selectedIconPath": "static/tab2-on.png" }
    ]
  }
}
```

### 🧭 导航 API

```js
uni.navigateTo({ url: '/pages/detail/detail?id=3' })   // 普通跳转（可返回）
uni.redirectTo({ url: '/pages/index/index' })          // 关闭当前再跳
uni.switchTab({ url: '/pages/stats/stats' })           // 跳 tabBar 页（专用！）
uni.navigateBack()                                     // 返回上一页
```

:::callout icon=⚠️
**tabBar 页面必须用 `switchTab` 跳转**，navigateTo 对它无效 —— 小程序导航第一坑！
:::

%%W1A%%

%%W1B%%

%%%%% W2
## 💬 交互反馈与设备能力

```js
uni.showToast({ title: '打卡成功 ✅', icon: 'success' })
uni.showModal({
  title: '确认删除？',
  success: (res) => { if (res.confirm) this.removeTask() },
})
uni.showLoading({ title: '保存中…' })
uni.hideLoading()
```

### 📷 常用设备能力

- 🖼️ `uni.chooseImage` — 选图/拍照（打卡配图！）
- 📋 `uni.setClipboardData` — 复制到剪贴板
- 📍 位置、扫码等 —— 用到时查 `uni.` 文档，模式都一样

:::callout icon=💡
交互反馈三件套（Toast / Modal / Loading）是小程序体验的底色：**每个异步操作都该有 loading，每个成功失败都有 Toast**。
:::

%%W2A%%

%%W2B%%

%%%%% W3
## 🔑 微信开放能力

- 🔑 **登录**：`uni.login` 拿 code → 后端换 openid（识别唯一用户的正规姿势）
- 👤 **用户信息**：头像昵称需用户主动授权（button open-type）
- 🔗 **分享**：页面 `onShareAppMessage` 返回标题/路径/图，右上角"…"即可转发
- 📨 **订阅消息**：服务通知触达用户（需模板 ID 与授权）

:::callout icon=⚠️
开放能力多数需要**后端配合**（如 code 换 session）或**在 mp.weixin.qq.com 后台配置**（域名白名单、消息模板）。课程项目先用本地存储，上线前再接登录。
:::

%%W3A%%

%%W3B%%

%%%%% GG4
## 💾 数据与存储

打卡记录、用户数据放哪？**本地存储先行，云端按需接入**。💾

%%GA4%%

%%%%% S1
## 💾 本地存储

```js
// 存
uni.setStorageSync('records', JSON.stringify(records))
// 取
const raw = uni.getStorageSync('records')
const records = raw ? JSON.parse(raw) : []
// 删
uni.removeStorageSync('records')
```

### ⚖️ Sync 还是异步 API？

- ⚡ `setStorageSync` — 同步，代码直观，**小数据用它最省心**（本课选择）
- 🌊 异步版 — 回调/promise 风格，大数据量不阻塞

:::callout icon=⚠️
本地存储**上限约 10MB** 且**清微信缓存会丢** —— 课程项目够用；上线产品请上云（下一章）。
:::

%%S1A%%

%%S1B%%

%%%%% S2
## 🌐 网络请求

```js
uni.request({
  url: 'https://api.example.com/records',
  method: 'GET',
  success: (res) => { this.list = res.data },
  fail: (err) => uni.showToast({ title: '网络错误', icon: 'error' }),
})
```

### 🌐 两个必知规则

- 🏷️ **域名白名单** — 真机/正式版只能请求**在小程序后台备案过的 https 域名**（开发工具里可勾选"不校验域名"调试）
- 🧰 **封装请求** — 把 uni.request 包一层（统一错误处理、loading、token）再全站使用 —— 让 Agent 写，5 分钟的事

:::callout icon=💡
"请求失败但开发者工具里好好的" 90% 是域名白名单 —— 真机调试前先去后台配置。
:::

%%S2A%%

%%S2B%%

%%%%% S3
## ☁️ 后端方案选择

| 方案 | 优点 | 适合 |
| --- | --- | --- |
| 📦 本地存储 | 零成本、即写即用 | 课程项目、个人工具 |
| ☁️ 微信云开发 | 免运维、自带登录打通 | 快速上线的小产品 |
| 🖥️ 自建后端 | 完全可控（Nuxt API 就行！） | 有服务器与长期计划 |

:::callout icon=💡
呼应 Web 课：你在 Nuxt 学的 server/api 在这里就是"自建后端"方案 —— 小程序用 `uni.request` 调它，配置好域名白名单即可。**全栈知识是通的。**
:::

%%S3A%%

%%S3B%%

%%%%% GG5
## 🚀 实战项目：班级打卡小程序

总装！🚀 做一个**班级打卡**小程序：每日任务打卡、连续天数统计、本地保存、真机体验版分发。

四次迭代，每步在微信开发者工具里真实可玩。

%%GA5%%

%%%%% M1
## 📋 项目规划与页面设计

### 📐 一页纸规划

- 📄 **页面**：打卡页（今日任务列表 + 打卡按钮）＋ 统计页（连续天数、完成率）→ **tabBar 两页**
- 🧊 **数据**：`{ date, taskId, done }` 记录列表，本地存储
- 🎨 **素材**：emoji 图标 + 纯色卡片（Agent 程序化生成 tabBar 图标）
- ✅ **验收**：打卡 → 杀掉小程序重开 → 记录还在 → 统计页数字正确

### ✂️ 拆给 Agent 的任务

1. 双页面骨架 + tabBar → 2. 打卡列表与交互 → 3. 存储与统计 → 4. 真机调试与提审准备

:::callout icon=💡
小程序选题心法：**一个高频小场景**（打卡/报名/记账）胜过一个面面俱到的大而全。
:::

%%M1A%%

%%M1B%%

%%%%% M2
## ✅ 核心功能开发

```js
// 打卡页核心逻辑
methods: {
  checkIn(taskId) {
    const today = new Date().toISOString().slice(0, 10)
    if (this.records.some(r => r.date === today && r.taskId === taskId)) {
      return uni.showToast({ title: '今天已打过啦', icon: 'none' })
    }
    this.records.push({ date: today, taskId, done: true })
    uni.setStorageSync('records', JSON.stringify(this.records))
    uni.showToast({ title: '打卡成功 ✅', icon: 'success' })
  }
}
```

### 🪜 迭代清单

1. 📋 任务列表渲染（v-for + 今日状态高亮）
2. ✅ 点按钮打卡 → 存储写入 → Toast 反馈
3. 🔁 重复打卡拦截（去重判断）
4. 📊 统计页：连续天数 = 从今天往前数"每天至少一条记录"的长度

%%M2A%%

%%M2B%%

%%%%% M3
## 📊 统计与打磨

- 📊 **连续天数（streak）**：倒着遍历日期，断一天就停 —— 经典循环小算法
- 🏆 **里程碑反馈**：连续 7 天弹出成就 Modal 🎉
- 🎨 **视觉统一**：卡片圆角、主题绿（微信色 #07c160）、完成态划线
- 🈳 **空状态**：首次进入引导页（"还没有任务，点 ➕ 添加"）

:::callout icon=💡
打磨轮让 Agent 出方案清单，你试玩勾选：哪些反馈到位、哪些太吵。**统计页是用户回访的理由** —— 数据可视化的性价比极高。
:::

%%M3A%%

%%M3B%%

%%%%% M4
## 📲 真机调试与发布上线

### 📲 三级发布阶梯

1. 🔍 **真机预览** — HBuilderX/开发者工具生成**二维码**，微信扫码真机体验
2. 🧪 **体验版** — 开发者工具"上传"→ 后台设为体验版 → 加体验成员 → 收集反馈
3. 🚀 **正式发布** — 后台"提交审核"（填类目、截图）→ 审核通过 → 全量发布

### 📋 提审自检清单

- ✅ 页面无空白/无报错/无测试数据
- ✅ 类目选对（教育-学习辅导类常见）
- ✅ 用户隐私：用到什么能力就声明什么（隐私协议要勾）

:::callout icon=⚠️
个人主体小程序**不能有支付、不能诱导分享**，类目敏感会被拒 —— 首次提审被拒很正常，看驳回原因改了再提。
:::

%%M4A%%

%%M4B%%

%%%%% GG6
## 🤖 Agent 辅助心法

小程序 × Agent 的独门方法：**平台文档当上下文、双端差异多留心、合规红线要牢记**。🤖

%%GA6%%

%%%%% A1
## 🤖 小程序开发的 Agent 工作流

### 📚 上下文给足（小程序特有）

- 📄 告诉 Agent：**目标平台是微信小程序**（它就会避开 Web-only 的 API）
- 🧩 贴出 **pages.json**、相关 uvue 页面、数据模型 —— 三件套是它的世界模型
- 🔀 提醒它用 **uni.\* API + 条件编译**，而不是原生 wx.\*（保持多端兼容）

### 🔁 迭代节奏

1. 📄 描述页面（界面语言）→ Agent 生成 uvue
2. 🔄 HBuilderX 编译 → 微信开发者工具自动刷新 → 立刻看效果
3. 🐞 报错/告警全文贴回 —— 小程序的报错常提示"哪个 API 哪个参数不对"，非常具体

:::callout icon=💡
小程序开发者工具的 **Console 和 AppData 面板**是调试神器：AppData 能直接看 data 实时值 —— 数据不对先看这里，再贴给 Agent。
:::

%%A1A%%

%%A1B%%

%%%%% A2
## 🔍 审查、合规与性能

### 🔍 代码审查要点

- 🧩 `text` 包裹文字、rpx 单位、`uni.` API —— 平台规范三查
- 🔀 条件编译块是否必要（能用通用 API 就不写 `#ifdef`）
- 📦 包体积：静态图片压缩，大资源走网络

### ⚖️ 合规红线（小程序特有考题！）

- 🛡️ **隐私协议**：收集用户信息（头像/位置/手机号）必须声明并取得同意
- 🚫 个人主体禁支付、禁诱导分享、禁部分类目
- 🌐 请求域名必须 https + 后台白名单

:::callout icon=💡
把小程序审核指南文档路径写进 AGENTS.md，让 Agent 在写功能前先自检"这个能力个人号能用吗、要什么声明" —— **合规前置，省一轮审核被拒**。
:::

%%A2A%%

%%A2B%%

%%%%% A3
## 🗺️ 进阶路线

- 🦄 **uni-app X 深入** — UTS 插件（调用原生能力）、编译原理与双端差异
- 🧩 **组件化** — 自定义组件、easycom 自动注册、组件库（uni-ui）
- ☁️ **接后端** — 微信云开发 / 自建 Nuxt API + 登录体系（code 换 openid）
- 🚀 **跨端复用** — 同一份代码出 App 与 Web 版（uni-app X 的终极卖点）

:::callout icon=🎯
结课作业：上线一个**真实可审核通过**的小程序（个人类目内），找 5 位同学真实使用一周，记录数据并做一次迭代。**过审 + 真实用户 = 这门课的毕业证。**🚀
:::

%%A3A%%

%%A3B%%
