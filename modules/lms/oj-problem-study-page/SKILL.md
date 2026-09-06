---
name: "oj-problem-study-page"
description: "给定一个 OJ 编程题 URL（Hydro/oldmoon 系，如 .../p/{pid}），抓取题目并生成单文件交互式 HTML 学习页（题目/解析/流程图/多解法 tab/源码高亮/逐步+自动播放动画/算法对比）。Invoke when the user gives an OJ problem URL and wants a study/learning/illustrated page for it."
---

# OJ 编程题交互式学习页生成

把一道 OJ 编程题做成一个**单文件**、纯前端、可离线双击打开、交互式的"题目 + 解析 + 多解法演示"HTML 页面，帮助理解与学习算法。

## 触发器（当何时调用本 skill）

- 用户给出一个 OJ 题目 URL（Hydro 系评测机，例如 `http://oj.example.com/p/CCC26J3`、`.../problem/123`），并希望为该题生成学习/讲解页。
- 用户说"给这道题做一个页面/解析/动画演示"等，且给的是 OJ 题目链接。

## 技术栈与硬性约束（不可随意替换）

- **单文件 HTML**，依赖全部走 CDN：Tailwind CSS（`https://cdn.tailwindcss.com`）、markdown-it（`.../markdown-it@14.1.0/dist/markdown-it.min.js`）、highlight.js（`@highlightjs/cdn-assets@11.9.0` 的 `highlight.min.js` + `styles/github.min.css`）、Mermaid（`.../mermaid@10.9.1/dist/mermaid.min.js`）。
- **原生 JS**，不引入构建工具/框架。
- **整体白色背景**：`body`、代码面板、演示面板都用白/浅灰。
- 代码固定、不需要真实跑 Python → **不要引入 Pyodide/pydiode 运行时**。用浏览器内模拟（见"动画演示"）实现逐步/自动播放。

## 抓取题目数据

Hydro 系 OJ 以 JSON 形式携带题目：请求时带 `Accept: application/json`。

```js
// 约定的取题函数（概念性，需按实际域名调用）
async function fetchOj(pid) {
  const url = `${OJ_BASE}/p/${pid}`;
  const data = await (await fetch(url, { headers: { Accept: 'application/json' } })).json();
  if (!data || !data.pdoc) return null;
  try { return JSON.parse(data.pdoc.content); } catch { return null; }
}
// 返回对象形如 { zh: "markdown...", en: "markdown..." }，题名为 data.pdoc.title
```

- 用 `pdoc.title` 作标题；取 `result.zh`（有则用中文）否则 `result.en`。
- 题目 markdown 里常带相对图片 `/p/{doctype}/file/xxx.png`。渲染时若作为独立页面，需把 `src` 前缀改写为绝对地址，并做 `img.onerror` 兜底删除。
- 相对/绝对 URL、特殊标记等属于该题的"任务内数据"，会随每次任务动态取出，不要写死进本 skill。

## 生成页面的整体结构（自上而下）

1. **Hero 区**：标题 + 标签（难度/题类/数据范围）。
2. **顶部 sticky 导航**（`sticky top-0 z-40` 白底）：约 6 个锚点按钮（题目/解析/多种解法/流程图/源码·动画/算法对比），每个目标区块加 `scroll-margin-top` 避免被吸顶栏遮挡。
3. **题目** `#problem`：中文"题意概述"卡片 + `#problemMd`（markdown-it 渲染的原文）。
4. **解析** `#analysis`：若干分析卡片（关键观察/核心判定/边界收尾/易错点），配"谁是赢家/胜负关系"这类直观图。
5. **多种解法** `#solutions`：
   - **tab 按钮**（解法 A/B/C…）切换不同解法。
   - **预制输入下拉** + 手动输入框（Ngoc/Minh 这类两行输入）+ 重置按钮。
   - **流程图**：包在 `<details id="flow">` 里（**默认折叠**），展开时用 **Mermaid** 渲染（`mermaid.render` 后注入 SVG）。用 `<details>` 而非常驻 SVG，避免箭头布线混乱、也节省版面。
   - **源码 + 动画** `#demo`：左右两栏。左栏 = python 源码（**highlight.js 高亮** + 行号 + 复制按钮，白底）；右栏 = 动画演示（糖果/两队列可视化 + 已吃计数 + 步骤说明 + 上一步/下一步/播放/暂停）。
6. **算法对比** `#compare`：选择多种解法在时间/空间/适用规模/推荐度的对比表，并加一行"朴素暴力写法为何会 TLE"的警示行（常见坑）。
7. footer + CDN 版权声明。

## 动画演示：浏览器内模拟（关键复用逻辑）

固定代码不真要跑，而是在 JS 里把算法"逐步骤追踪"出来再逐帧展示，同时联动高亮源码行。

- 用 `makeTrace(a, b)` 返回步骤数组。每一**步**记录：
  - `aRem/bRem`：该步两排的剩余序列（数组，用于画糖果）；
  - `na/nb`：该步后两人的累计计数；
  - `eaten` 类型（`'both' | 'A' | 'B'`）+ `count`（本步吃掉的颗数，用于把队首标成"被吃/淡出"）；
  - `lines`：当前步应高亮的**源码行号数组**；
  - `desc`：该步的自然语言说明（HTML 片段）。
- 始终 push 一个"初始化"步和一个"收尾"步（收尾把**另一排剩余糖全部计入**计数，这是初版最易漏的 bug）。
- 每一步用一个 for 循环迭代比对队首；同色各吃一颗，不同色按 `win` 表判胜负、只吃失败者、赢家糖留队首。
- 渲染：`drawLane(el, arr, eatCount)` 按颜色画圆糖，第 `0..eatCount-1` 个标 `eaten`，剩余首个标 `front`（蓝圈）。`drawStep(st)` 更新两条 lane、计数、说明、步骤指示、并 `toggle('hl')` 高亮 `st.lines`。
- 控制：
  - `goTo/goNext/goPrev`；`stepInd` 显示 `步骤 x / y`。
  - **自动播放必须正确清理定时器**：`startPlay` 在 `setInterval` 前先 `clearInterval`；`stopPlay` 必须 `clearInterval(timer)` 并置 `timer=null`、按钮恢复"▶ 播放"。否则点暂停后手动切步仍会被旧定时器带飞（常见 bug）。
  - 手动"上一步/下一步"也要先 `stopPlay()`。
- 每解法的 `makeTrace` 可不同：普通解法按颗逐步（1 步=1 次比对），游程压缩等优化解法可按"段/批"步进（步数更少，能体现算法优化点）。
- 源码按行渲染成 `<span class="code-line" data-ln="i">`，配合 `.code-line.hl{ }` 高亮样式；highlight.js 用法：`hljs.highlight(line, {language:'python'}).value`（对运维/主流程用相同方式）。

## 题目分析法（方法论建议，可复用于任意题）

写给"读者"看的页面，先自己在脑内把题吃透：

1. **读题转状态**：把叙事转成明确的状态/数据结构（这里是两排序列 + 两个累计计数）。明确一轮到底"变更了什么"。
2. **找不变量 / 复杂度下界**：每轮至少消耗 1 颗 → O(N+M)；通常输入已决定下界，能到 O(N) 就别做 O(N²)。
3. **判定/胜负关系浓缩**：用小型查表（如 `win = {赢家:输家}`）替代一堆 if，阅读者一眼看懂。
4. **边界与收尾**：循环退出条件（一排空）、退出后剩余如何处理，是丢分的重灾区，务必写进解析和代码注释。
5. **区分解法层次**：给读者 2–3 种"结构不同"的写法（指针/队列/压缩），并明确各自的时间/空间权衡。
6. **给易错点单独警示**：例如把 O(n) 弹队首误当成 O(1)（`list.pop(0)`）导致 TLE，值得单独一段。

## 通用页面改进建议（检查清单）

- 增加**题意概述**中文卡片，先讲人话再给原文。
- 给**胜负/循环关系**配直观的"克制环"图（R→G→B→R）。
- `<details>` 收起流程、换 Mermaid 自动布线，避免箭头错乱。
- **预制输入**给多个极端场景（最小/同色/单边碾压/循环克制/长串混战），一键切换并验证答案。
- 动画**优先级**：逐步可控 > 自动播放；两个都要；高亮与动画严格联动。
- 白色背景 + highlight.js，代码可读且适合打印/分享。
- 提供"复制源码"（纯文字按钮）便于搬运到 OJ 提交。
- 最终结果用一个"算法对比表 + 复杂度结论"收尾。

## 隐私与安全

- 抓取的题目内容属于该题数据，页面里随任务实时写入即可，**不要**把某道题的原文、答案、特殊标记硬编码进本 skill。
- 不要写入任何用户私密信息/凭据/内网地址。