%%%%% G01
## 🌐 走进 Web 开发

网站是怎么出现在浏览器里的？怎么让 **AI Agent** 帮我们把想法变成真正上线的网站？🌐

这门课以 **Nuxt 框架**为骨架、**AI Agent** 为加速器，带你走完「理解 Web → 写页面 → 造全栈应用 → 上线」的完整旅程。

%%GA1%%

%%%%% W01
## 🕸️ Web 是如何工作的？

### 🏗️ 浏览器与服务器的对话

每次打开网页，都发生了一场对话：

1. ⌨️ 你在浏览器输入 **URL**（如 `https://aics.oldmoon.cn/course/14/10`）
2. 📡 浏览器向服务器发送 **HTTP 请求**
3. 🖥️ 服务器返回 **HTML / CSS / JavaScript** 等资源
4. 🎨 浏览器解析并渲染，你看到了页面

### 🧑‍🤝‍🧑 前端与后端

- 🎨 **前端** — 跑在浏览器里：页面结构（HTML）、样式（CSS）、交互（JS）
- ⚙️ **后端** — 跑在服务器上：处理业务逻辑、读写数据库、提供 **API**（数据接口）
- 📦 **全栈** — 一个人搞定前后端！Nuxt 就是全栈框架：一个项目同时写前端页面和后端 API

:::callout icon=💡
打开任意网页按 F12 → Network 面板，亲眼看看这场"请求-响应"的对话 —— 这是理解 Web 的第一课。
:::

%%W01A%%

%%W01B%%

%%%%% W02
## 🤖 用 AI Agent 学开发：新范式

这门课的独特之处：**AI Agent 是你的结对程序员** —— 你负责思考、决策和审查，Agent 负责生成、补全和重复劳动。

### 🔄 本课的开发循环

1. 🎯 **说明**：用清晰的提示词描述要做什么（目标 + 上下文 + 约束 + 格式）
2. ⚙️ **生成**：Agent 写出代码/页面/API
3. 👀 **审查**：读代码、跑起来验证 —— **你永远是最终责任人**
4. 🔁 **迭代**：报错贴回去、需求改一改、小步前进

### 🧰 工具选择

- 💻 **编码 Agent**（Codex / Claude Code）：在项目文件夹里读代码、改文件、跑命令 —— 本课主力
- 🖥️ **桌面助手**（WorkBuddy）：查资料、写文档、解释概念
- 🌐 **Web 对话**：快速小问题

:::callout icon=⚠️
用 Agent 不代表不学原理 —— 恰恰相反：**你越懂，Agent 的产出越可控**。每章我们都先懂原理，再让 Agent 加速。
:::

%%W02A%%

%%W02B%%

%%%%% W03
## 🛠️ 搭建开发环境

### 📦 安装三件套

1. 🟢 **Node.js**（LTS 版）— JavaScript 的运行时，`node -v` 验证
2. 📦 **包管理器 pnpm** — `npm install -g pnpm`（或 corepack 启用）
3. 🖥️ **VS Code** + Volar 插件 — Vue/Nuxt 官方推荐的编辑器

### 🚀 创建 Nuxt 项目

```bash
pnpm create nuxt my-first-app   # 官方脚手架，一路按需选择
cd my-first-app
pnpm dev                        # 启动开发服务器 → http://localhost:3000
```

:::callout icon=💡
现在把项目文件夹交给你的编码 Agent（打开终端、cd 进项目、启动 Agent）—— 之后每一章都可以让它边讲边改代码。**项目文件夹就是 Agent 的工作台。**
:::

%%W03A%%

%%W03B%%

%%%%% G02
## 🧱 Web 三件套

HTML、CSS、JavaScript 是网页的地基 —— Agent 能生成它们，但**看懂它们你才能审查**。🧱

三个章节各配一个"让 Agent 改造页面"的实战点。

%%GA2%%

%%%%% H01
## 🦴 HTML：页面的骨架

HTML 用**标签**描述内容的结构与语义：

```html
<h1>我的第一个网页</h1>
<p>这是一个 <strong>段落</strong>，<em>强调</em> 很重要。</p>
<ul>
  <li>列表项 1</li>
  <li>列表项 2</li>
</ul>
<a href="https://nuxt.com">超链接</a>
<img src="/logo.png" alt="网站标志">
```

### 🧭 语义化标签

`<header>` 页头、`<nav>` 导航、`<main>` 主体、`<footer>` 页脚 —— 用对语义，浏览器和搜索引擎都更懂你的页面。

### 📝 表单（交互的起点）

```html
<form>
  <input type="text" placeholder="用户名">
  <input type="password" placeholder="密码">
  <button type="submit">登录</button>
</form>
```

%%H01A%%

%%H01B%%

%%%%% H02
## 🎨 CSS：样式与布局

### 🎯 选择器与盒子模型

```css
h1 { color: #2563eb; font-size: 32px; }   /* 标签选择器 */
.card { padding: 16px; border-radius: 8px; }  /* 类选择器 */
#hero { background: linear-gradient(#3b82f6, #8b5cf6); }
```

每个元素都是一个**盒子**：content → padding → border → margin，理解盒模型 = 理解 80% 的样式问题。

### 🧭 Flex 与 Grid（现代布局两板斧）

```css
.nav { display: flex; justify-content: space-between; align-items: center; }
.gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
```

### 📱 响应式

```css
@media (max-width: 768px) { .sidebar { display: none; } }
```

:::callout icon=💡
实战：让 Agent「把这个页面改成移动端单列布局，用 flexbox 替代 float」—— 然后拖动浏览器窗口宽度验证效果。
:::

%%H02A%%

%%H02B%%

%%%%% J01
## ⚡ JavaScript：让页面动起来

JavaScript 是浏览器的编程语言 —— 变量、函数、条件循环与 Python/C++ 思路相通：

```js
const scores = [80, 92, 75];
const avg = scores.reduce((s, x) => s + x, 0) / scores.length;

document.querySelector('#btn').addEventListener('click', () => {
  alert(`平均分 ${avg}`);
});
```

### 🌐 fetch：向 API 要数据

```js
const res = await fetch('/api/courses');
const data = await res.json();       // JSON → JS 对象
console.log(data);
```

:::callout icon=💡
现代 JS 大量使用 **async/await** 处理异步请求 —— 记住模式：`await fetch(url)` → `await res.json()` → 拿到数据。
:::

%%J01A%%

%%J01B%%

%%%%% G03
## 🟢 Vue 与 Nuxt 入门

**Vue** 让我们用「组件」拼页面、用「响应式」让数据自动驱动视图；**Nuxt** 在 Vue 之上加上路由、服务端渲染和全栈能力。🟢

先 Vue 后 Nuxt —— 顺序不能反。

%%GA3%%

%%%%% V01
## 🧩 Vue 组件化思维

### 🧩 单文件组件（.vue）

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)          // 响应式数据
</script>

<template>
  <button @click="count++">点了 {{ count }} 次</button>
</template>

<style scoped>
button { font-size: 18px; }
</style>
```

- 📜 一个 `.vue` 文件 = 结构（template）+ 逻辑（script）+ 样式（style）
- ⚡ **响应式**：`ref` 包住的数据一变，页面自动更新 —— 不用手动操作 DOM！

:::callout icon=💡
心智模型：**UI = f(state)**。你只管改数据（state），Vue 负责刷新界面（f）。
:::

%%V01A%%

%%V01B%%

%%%%% V02
## 🔄 模板语法与组件通信

### 🧭 常用指令

```vue
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
<p v-if="items.length === 0">空空如也 🈳</p>
<img :src="item.cover">          <!-- : 绑定属性 -->
<input v-model="keyword">        <!-- 双向绑定表单 -->
```

### 📡 父子通信

```vue
<!-- 子组件 Child.vue：props 进，emit 出 -->
<script setup>
defineProps({ title: String })
const emit = defineEmits(['pick'])
</script>

<!-- 父组件 -->
<Child title="课程列表" @pick="onPick" />
```

### 🧮 computed 与 watch

- 🧮 `computed` — 由其他数据**算出来**的值，自动缓存
- 👀 `watch` — 数据变化时执行副作用（请求、存储）

%%V02A%%

%%V02B%%

%%%%% N01
## 🟢 Nuxt 初体验：文件即路由

Nuxt 的魔法：**pages 目录下的文件自动变成路由**，零配置。

```bash
pages/
├── index.vue          →  /
├── about.vue          →  /about
└── courses/
    └── [id].vue       →  /courses/1、/courses/42 …（动态路由）
```

### 🔗 页面导航

```vue
<NuxtLink to="/about">关于我们</NuxtLink>   <!-- 不要用 <a>，NuxtLink 不刷新整页 -->
```

### ⚙️ 其他开箱能力

- 📦 **自动导入** — `ref`、`useFetch`、components/ 下的组件，全部不用手动 import
- 🖥️ **服务端渲染 SSR** — 页面在服务器先渲染好 HTML 再发给浏览器（首屏快、SEO 好）
- 💧 **水合（Hydration）** — 浏览器接管页面后恢复交互能力

:::callout icon=💡
实战：让 Agent「新建 pages/links.vue，展示我最常用的 5 个网站，用 NuxtLink 跳转」—— 然后浏览器访问 /links 验证。
:::

%%N01A%%

%%N01B%%

%%%%% N02
## 🧱 布局与组件复用

### 🧱 layouts — 全站骨架

```vue
<!-- layouts/default.vue -->
<template>
  <header>🎓 AICS 学院</header>
  <slot />                    <!-- 页面内容插到这里 -->
  <footer>© 2026</footer>
</template>
```

所有页面自动套上这个骨架 —— 导航栏、页脚只写一次。

### 🧩 components — 复用积木

```bash
components/
└── CourseCard.vue     →  任何页面直接写 <CourseCard :course="c" />
```

:::callout icon=💡
复用判断法：同一段 UI 出现第二次，就抽成组件。让 Agent 做"组件抽取"非常在行 —— 但**接口设计（props 怎么定）要你拍板**。
:::

%%N02A%%

%%N02B%%

%%%%% G04
## ⚙️ Nuxt 核心能力

数据获取、服务端 API、共享状态、样式方案 —— Nuxt 全栈能力的四大支柱。⚙️

学会这四个，你就能独立搭建真实应用了。

%%GA4%%

%%%%% N03
## 📥 数据获取：useFetch 与 SSR

```vue
<script setup>
// 自动处理 SSR + 客户端水合 + 防重复请求
const { data: courses, pending, error } = await useFetch('/api/courses')
</script>

<template>
  <p v-if="pending">加载中…</p>
  <p v-else-if="error">出错了：{{ error.message }}</p>
  <CourseCard v-else v-for="c in courses" :key="c.id" :course="c" />
</template>
```

### 🔑 三个关键点

- 🗝️ **key 缓存** — 同一 URL 的请求在服务端和客户端只发一次（结果自动传递，避免"服务器请求一次 + 浏览器再请求一次"）
- 👀 `pending` / `error` — 加载与错误状态开箱即用
- 🔁 `refresh()` — 手动刷新数据（提交表单后重新拉列表）

:::callout icon=⚠️
常见坑：`useFetch` 的结果**不要**解构丢响应性；需要 watch 重新请求时用 `watch` 选项或 `refresh()`。
:::

%%N03A%%

%%N03B%%

%%%%% N04
## ⚙️ 服务端 API：server/api

在 **server/api/** 下建文件，自动变成后端接口 —— 前后端同一个项目！

```js
// server/api/courses.get.js → GET /api/courses
export default defineEventHandler(() => {
  return [
    { id: 1, title: 'Web 开发', chapters: 10 },
    { id: 2, title: 'NOI 备考', chapters: 30 },
  ]
})

// server/api/courses/[id].get.js → GET /api/courses/42
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { id, title: `课程 ${id}` }
})
```

### ✍️ 处理 POST（读请求体）

```js
// server/api/messages.post.js
export default defineEventHandler(async (event) => {
  const body = await readBody(event)      // { name, text }
  // 存数据库 / 校验 / 返回结果
  return { ok: true, received: body }
})
```

:::callout icon=💡
服务端代码**只在服务器运行** —— 数据库密码等机密放 `server/` 或环境变量，绝不写进前端代码。
:::

%%N04A%%

%%N04B%%

%%%%% N05
## 🧊 状态管理：useState 与 composables

### 🧊 useState — 跨组件共享状态

```js
// 任何组件里读写同一个值（SSR 安全）
const user = useState('user', () => null)
user.value = { name: 'Ada' }
```

### 🧰 composables — 逻辑复用

把「取数 + 处理」封装成可复用函数（约定 `use` 开头）：

```js
// composables/useCourseDetail.ts
export function useCourseDetail(id: string) {
  return useFetch(`/api/courses/${id}`)
}
```

:::callout icon=💡
分层心法（本项目真实用法）：**layout 层负责取数，页面层只读共享状态** —— 数据流单向清晰，Agent 改代码时也不容易迷路。
:::

%%N05A%%

%%N05B%%

%%%%% N06
## 🎨 样式方案：Tailwind CSS

**Tailwind** 用原子类直接在模板里写样式，不用来回切文件：

```vue
<template>
  <div class="flex items-center gap-3 rounded-xl bg-blue-50 p-4 shadow">
    <img class="h-12 w-12 rounded-full" :src="course.cover">
    <div>
      <h3 class="font-bold text-gray-900">{{ course.title }}</h3>
      <p class="text-sm text-gray-500">{{ course.chapters }} 章</p>
    </div>
  </div>
</template>
```

- 🎨 `flex` `gap-3` `p-4` `text-gray-500` —— 每个类做一件小事，组合出任何设计
- 📱 响应式前缀：`md:flex-row`（≥768px 才生效）、暗黑模式 `dark:bg-gray-800`
- 🧰 Nuxt 项目配 **Nuxt UI** 组件库：按钮、弹窗、抽屉开箱即用（`<UButton>`、`<UDrawer>`）

:::callout icon=💡
Tailwind + Agent 是绝配：Agent 极擅长「按你描述的视觉效果生成原子类」。你负责说"卡片、左图右文、圆角阴影"，它负责类名。
:::

%%N06A%%

%%N06B%%

%%%%% G05
## 🚀 实战项目：用 Agent 造一个应用

理论就绪，开工！🚀 这一组**以 Agent 为主力**做一个完整的小应用：**课程卡片站**（首页列表 + 详情页 + 访客留言）。

每一章都是一个真实开发阶段 —— 按 Agent 工作流走完。

%%GA5%%

%%%%% P01
## 📋 项目规划：从想法到任务清单

写代码前先回答三个问题：**做什么、给谁用、长什么样**。

### 📋 需求清单示例

- 首页：课程卡片列表（封面、标题、章节数）
- 详情页：/courses/[id]，显示简介
- 留言板：访客留言，存到后端

### 🎯 把需求翻译成 Agent 任务

❌ 差的任务："帮我做个网站"

✅ 好的任务："在 pages/index.vue 用 useFetch 请求 /api/courses，渲染卡片网格（Tailwind grid 三列，移动端一列），卡片组件抽到 components/CourseCard.vue，props 传 course 对象"

:::callout icon=💡
**大任务拆成 3~5 个小任务**，一个一个交给 Agent —— 小步快跑比一口气生成更可控，出错也好定位。
:::

%%P01A%%

%%P01B%%

%%%%% P02
## 🖥️ 页面开发实战

### 🪜 分步执行

1. 让 Agent 生成 `server/api/courses.get.js` 返回假数据（先有接口再画页面！）
2. 生成 `pages/index.vue` 列表页 + `components/CourseCard.vue` 卡片
3. 生成 `pages/courses/[id].vue` 详情页（从假数据按 id 查找）
4. 👀 **你审查**：页面真的渲染了吗？刷新正常吗（SSR）？空数据时显示什么？

### 👀 审查清单

- ✅ 浏览器控制台有没有报错？（F12 → Console）
- ✅ 直接刷新 /courses/1 正常吗？（动态路由 + SSR）
- ✅ 移动端宽度下布局对吗？

:::callout icon=⚠️
Agent 生成的页面"看起来对"不等于"跑起来对" —— 每一步都在浏览器里点一遍再继续。
:::

%%P02A%%

%%P02B%%

%%%%% P03
## 🔌 全栈打通：API + 数据 + 表单

现在把留言板做**真**：前端表单 → POST 接口 → 服务端存储 → 列表刷新。

### 🧭 三步走

1. ⚙️ `server/api/messages.post.js` — 接收留言，写入 JSON 文件或数据库
2. ⚙️ `server/api/messages.get.js` — 返回留言列表
3. 🎨 留言页：`v-model` 绑定表单 → `await $fetch('/api/messages', { method: 'POST', body })` → `refresh()` 刷新列表

```vue
<script setup>
const { data: messages, refresh } = await useFetch('/api/messages')
const text = ref('')
async function submit() {
  await $fetch('/api/messages', { method: 'POST', body: { text: text.value } })
  text.value = ''
  await refresh()
}
</script>
```

:::callout icon=💡
全栈调试心法：**先单独验证 API**（浏览器直接开 /api/messages 或 curl），确认后端正确，再查前端 —— 永远先隔离问题再合并排查。
:::

%%P03A%%

%%P03B%%

%%%%% P04
## 🐞 修 Bug 与迭代

写代码 = 修代码。让 Agent 高效修 Bug 的秘诀是**喂对信息**。

### 🐞 Bug 报告模板（直接发给 Agent）

> 🎯 现象：访问 /courses/3 白屏，控制台报错 `Cannot read properties of undefined (reading 'title')`
> 🔁 复现：刷新 100% 复现；从首页点进不报错
> 📌 我的猜测：数据还没加载完模板就访问了 title
> 🧭 希望你：找到根因并修复，顺便给详情页加上加载与错误状态

### 🔁 迭代节奏

- ✅ 一次只修一个问题，修完**验证**再下一个
- ✅ 让 Agent 解释根因（"为什么会这样？"）—— 这是学习最快的时刻
- ✅ 改对了让 Agent 顺手加个防回归的处理（如默认值/空态）

%%P04A%%

%%P04B%%

%%%%% G06
## 🚀 上线与部署

localhost 上的网站只有你自己能看 —— 部署让它走向世界。🚀

构建、性能、安全：上线前的最后一公里。

%%GA6%%

%%%%% D01
## 📦 构建与部署

### 🏗️ 构建命令

```bash
pnpm build       # 生产构建（Node 服务器模式）
pnpm generate    # 静态生成（纯静态托管：适合内容型站点）
pnpm preview     # 本地预览生产构建
```

### 🌍 部署方式

- 🖥️ **服务器部署**：`node .output/server/index.mjs`，配 **PM2** 守护进程
- 📄 **静态托管**：`pnpm generate` 后把 `.output/public` 传到任意静态服务
- ☁️ **平台部署**：Vercel / Netlify 连 Git 仓库自动发布

### 🔐 环境变量

```bash
# .env（绝不提交到 git！）
DATABASE_URL=postgres://...
API_SECRET=***
```

:::callout icon=⚠️
`.env` 里的密钥一旦推到公开仓库 = 泄密。`server/` 里的代码读环境变量安全，**前端代码里的任何常量都会被用户看到**。
:::

%%D01A%%

%%D01B%%

%%%%% D02
## ⚡ 性能与 SEO

### ⚡ SSR 的性能红利

Nuxt 服务端渲染：用户第一屏拿到**完整 HTML**（不用等 JS 下载执行）—— 首屏快、搜索引擎能抓取内容。

### 🔍 SEO 三件套

```vue
<script setup>
useSeoMeta({
  title: 'AICS 学院 — 课程中心',
  description: 'Nuxt + AI Agent 的全栈课程',
  ogTitle: 'AICS 学院',
  ogImage: '/cover.png',
})
</script>
```

### 📊 体检工具

- 🔍 **Lighthouse**（F12）— 性能/SEO/无障碍打分
- 🖼️ 图片用 `<NuxtImg>` 自动压缩、懒加载
- 📦 检查打包体积：少引大库，能用原生就不装包

%%D02A%%

%%D02B%%

%%%%% D03
## 🔒 安全与最佳实践

### 🔒 前后端安全底线

- 🧼 **永不信任用户输入** — 服务端校验类型/长度/范围，前端校验只是体验优化
- 🎭 **XSS** — 不要用 `v-html` 渲染用户内容（除非消毒）
- 🔑 **密钥只在服务端** — 前端代码全部公开可读
- 🚦 接口做**权限检查**（谁是管理员？谁能改数据？）

### 🌿 Git 工作流

```bash
git add -A && git commit -m "feat: 课程卡片列表"   # 小步提交
```

- ✅ 每完成一个小功能就提交 —— 出问题随时回滚
- ✅ Agent 改动后先 `git diff` 审查再提交
- ✅ 写清 commit message：feat（新功能）/ fix（修 bug）

:::callout icon=💡
安全心的养成：每写一个接口，问自己三句 —— **谁能调用？输入可信吗？出错会泄露什么？**
:::

%%D03A%%

%%D03B%%

%%%%% G07
## 🤝 AI 协作心法

最后一组不是技术，是**元技能**：如何与 AI 长期高质量协作。🤝

把这门课的工作流变成你的肌肉记忆。

%%GA7%%

%%%%% E01
## ✍️ 提示词工程 for 编码

### 📐 编码任务提示词模板

> 🎯 **目标**：在详情页加上"上一课/下一课"导航
> 📚 **上下文**：pages/courses/[id].vue 已存在；课程列表来自 useCourseDetail；项目用 Nuxt 4 + Tailwind
> 🚧 **约束**：不改现有 API；组件放 components/；移动端要能用
> 📦 **产出**：直接改文件，改动后跑一遍页面确认

### 🧠 三条心法

- 📚 **上下文给足**：相关文件路径、技术栈版本、已有约定（写进项目的 **AGENTS.md**，Agent 每次自动读取）
- ✂️ **任务切小**：一个提示词一件事，做完验证再做下一件
- 🔁 **反馈具体**："按钮在手机上溢出" 优于 "样式有点问题"

%%E01A%%

%%E01B%%

%%%%% E02
## 👀 审查 AI 代码

Agent 写得快，**你的审查是质量闸门**。👀

### 🕵️ 四步审查法

1. ✅ **跑起来** — 功能真的能用吗？（一切审查的前提）
2. 🧠 **读懂它** — 说得出每段代码在干嘛；说不懂就追问 Agent 解释
3. 🔓 **挑安全刺** — 用户输入进服务端了吗？密钥在前端吗？
4. 🧹 **挑风格刺** — 命名、复用、与项目现有代码一致吗？

:::callout icon=💡
审查的最高境界：**让 Agent 自己复查** —— "请以资深审查者视角 review 刚才的改动，列出风险"。AI 审 AI，你做终审。
:::

%%E02A%%

%%E02B%%

%%%%% E03
## 🗺️ 学习路径与资源

课程结束，路才刚开始。🗺️

### 📚 继续深入

- 🟢 **Nuxt 官方文档**（nuxt.com）— 最权威，Agent 也推荐你读它（它能帮你边读边练）
- 🟩 **Vue 官方文档**（vuejs.org）— 响应式与组件系统的完整心智模型
- 🧰 **Nuxt UI** — 生产级组件库，做课程项目直接上

### 🎯 三条进阶路线

- 🛠️ **全栈深化** — 数据库（Drizzle ORM）、认证登录、文件上传
- ⚡ **工程化** — 测试（Vitest）、CI/CD、monorepo
- 🤖 **Agent 深化** — 写自定义 skill、自动化工作流、MCP 连接外部服务

:::callout icon=🎯
结课作业：独立完成一个「对真实用户有用」的小站 —— 给社团做报名页、给老师做课件库。**真实需求 + Agent 加速 + 你的审查**，就是你已经掌握的全部。出发吧！🚀
:::

%%E03A%%

%%E03B%%
