# Course 5 · Chapter 161 / 162 排版评审

> 评审对象：`http://10.28.1.151/course/5/161`（Feature and Edge Detection）、`/course/5/162`（Image Classification）
> 数据来源：生产库 `chapters.content`（PostgreSQL jsonb）当前快照
> 快照时间：2026-09-22 16:08 前后（**注意**：161 在 16:04、162 在 16:02 刚被编辑过，两章 `updated_at` 都是当天）

---

## 一、共同点（两章共用同一套排版模板）

### 1. 骨架完全同构

| 槽位 | 161 | 162 |
| --- | --- | --- |
| 首节 | `## 🎯 Learning Objectives` | 同 |
| 次节 | `### 📖 Glossary` | 同 |
| Activity 1 | 体验演示 iframe + 提交作业 | 同 |
| Activity 2 | 海报图 + 概念题 + 评论 | 同 |
| 中间 Activity | `## 🧪 Activity 3 Arithmetic OJ Exercise` | `## 🧪 Activity 3 AI PPT` |
| 末节 | `## 🧪 Activity 5 (Extra) Finish more` | `## 🧪 Activity 4 (Extra) Finish more` |

- **正文不出现 h1**，全部从 h2（Activity / 顶层板块）切分，h3 切子步骤 —— 与 `skills/03` 的约定一致。
- **每个 Activity 的 h3 子块角色固定**：`体验/阅读` → `交作业` → `提问` → `评论`。两章的 h3 文案大量复用（`Read posters`、`Share your idea` 一字不差）。
- 两章「Activity 4 (Extra) Finish more」的 heading `id` 甚至是同一个 `gc9d6z5b7h` —— 同模板复制的痕迹（`id` 只需文档内唯一，无副作用）。

### 2. 节点语汇完全一致

两章都只用这几类节点，没有出现 quiz / race / pdf / office / 表格以外的富组件：

`heading` · `orderedList`（学习目标）· `table`（Glossary）· `blockquote`（指令句）· `iframe`（交互演示）· `image`（海报）· `vue{question|homework|comment}`

- **零 `codeBlock`**（两章都是 0）。
- 图片一律走站内 URL：`/api/files/serve?pathname=224%2F273.webp` 这类，外链图片为 0。
- 所有 `vue` 节点 `attrs.height` 都是 `null`（用默认高度），结构完全对齐。

### 3. 题量与分值口径一致

| | 161 | 162 |
| --- | --- | --- |
| 题数 | 23 | 14 |
| 总分 | 136 | 85 |
| 题型 | single / multiple / fill / match / classify / sort / html / oj | single / multiple / fill / sort / html / oj |
| 分值 | 2 / 5 / 10 | 2 / 5 / 10 |
| OJ 配对 | 8 对（OJ 10 分 + Code Order 2 分） | 5 对（同上） |
| 交互题 | html 10 分（Type game） | html 10 分（Spot the Difference） |
| 概念题 | 5 分 × 6 | 5 分 × 3 |
| 作业 / 评论 | 1 / 1 | 2 / 1 |

- **「OJ + 紧接着一道 Code Order 排序题」已成两章统一范式**，且每个配对上方配 h3（161 是 `### 🧮 P1004 …`，162 是这次新加的 `### 🧮 P1011 …`）。
- 概念题开头都带类型 emoji 前缀：`🔎 Single:` / `✅ Multiple:` / `✏️ Fill:`。

### 4. 其它共性

- **术语表结构相同**：`Term | Definition` 两列，各 6 条术语。
- **学习目标写法相同**：`orderedList`，每条以 emoji 开头，最后一条固定是 `(Extra) …` 延伸任务。
- **文末都有一个空 `paragraph`**（两章各 1 个），是编辑器留下的尾巴。
- **两章当前都是 `is_open = false`**（未开放），学生侧看不到。
- **heading 全部带 `id` + `data-toc-id` 且文档内唯一**（161: 22/22，162: 18/18），右侧 TOC 正常。

---

## 二、可优化点

### A. 站点级 / 硬伤（优先级高）

**A1. 三处 `https://10.28.1.152/vision/*` 的 iframe 在浏览器里是白屏**

| 位置 | 地址 |
| --- | --- |
| 161 Activity 1 | `https://10.28.1.152/vision/edge-detection`（h=818） |
| 161 Activity 1 | `https://10.28.1.152/vision/feature-extraction`（h=646） |
| 162 Activity 1 | `https://10.28.1.152/vision/image-classification`（h=558） |

实测该机用的是 **mkcert 开发证书**：`curl` 加 `-k` 返回 200，不加 `-k` 直接 `000`（TLS 校验失败）。浏览器等价于 `ERR_CERT_AUTHORITY_INVALID` → iframe **静默白屏**，学生只会看到一块空白。正解是给那台机器签受信证书（如 `vision.minxin.app`），属服务器侧工作。

**A2. 两道 html 小游戏走的是内网 HTTP + 非标端口**

- 161 `Type game`：`http://10.28.1.151:3010/games/typing/`
- 162 `Spot the Difference`：`http://10.28.1.151:3010/games/spot-the-difference/`

内网可用（实测 200），但公网入口是 `https://lms.minxin.app`：① 内网 IP 外网访问不到；② https 页面里嵌 http iframe 会被**混合内容策略拦掉**。建议这两个游戏挪到与 LMS 同源同协议（或统一走受信 https 域名）。

**A3. 161 Activity 4 用 iframe 嵌了「自己站内的章节页」**

`<iframe src="/course/9/102" height="607">` —— 相对路径会跟随当前域名，本身没问题，但被嵌页面是完整路由页：实测 SSR 输出里含 `<header>` + `aside`/`sidebar`/`nav`/TOC，**HTML 体积 815 KB**。等于在一个章节里又套了一整套站点外壳（嵌套 header + 侧栏 + 目录），既难看又重。建议：要么给章节页加一个 `?embed=1`（隐去 header / 侧栏 / TOC）的布局，要么直接改成「点击打开」的外链。

### B. 排版一致性（优先级中，改起来是几分钟的事）

**B1. h3 标题的风格不统一 —— 有 emoji / 加粗 / 都没有，三种混用**

| 章节 | 不一致的标题 | 问题 |
| --- | --- | --- |
| 161 | `Experience AI vison` | 无 emoji、无加粗，且 **`vison` 拼错**（应为 `vision`） |
| 161 | `Submit your homework` | 无 emoji、无加粗 |
| 161 | `Read posters` | 无 emoji、无加粗 |
| 161 | `Share your idea` | 无 emoji、无加粗 |
| 161 | `Type game` | 无 emoji、无加粗 |
| 161 | `P1016 ` | 无 emoji、无加粗、**末尾多一个空格**、且**没有 OJ 题名**（同章的同类标题是 `🧮 P1004 Addition and Subtraction`） |
| 162 | `Experience Image Classification` | 无 emoji、无加粗 |
| 162 | `Read posters` | 无 emoji、无加粗 |
| 162 | `Spot the difference` | 无 emoji、无加粗 |

对照基准（做对的）：`📖 Glossary`、`📸 Submit your screenshot`、`📝 Check Your Understanding`、`💬 Share your idea`、`📤 Submit your PPT`、`🧩 Questions on the Feature Extraction poster`、`🧮 P10xx …`、`🔀 Single Branch —— If`。

两章加粗与否也不一致：161 的 h2/h3 绝大多数带 `bold` mark，162 只有 h2 带 bold、所有 h3 都不带。

**B2. Activity 4 的 emoji 不合群**

`## 🌿 Activity 4 Python Branch` 用 🌿，其余 Activity 一律 🧪。

**B3. 161 Activity 2 的小标题与内容范围不符**

`### 🧩 Questions on the Feature Extraction poster` 下方挂了 **6 道题**，其中 45/46/48 属于另一张海报（edge detection，题名分别是 `✏️ Fill in the Blank: Where Changes Happen` / `🔗 Matching: Concepts and Descriptions` / `🗂️ Classification: Two Techniques`）。标题只说 Feature Extraction，范围偏小。此前曾拆成两个 h3（`Questions on the Feature Extraction poster` / `Questions on the Edge Detection poster`），现在合回一个了。

**B4. Glossary 的措辞语域两章差一档**

同样是「术语表」，161 是学术书面语（"A vital image processing technique that extracts key visual features…"），162 是儿童口语（"Teaching a computer to look at a picture and tell you what it shows"）。同一门课相邻两章，读起来像两个作者。

**B5. 文末各留一个空 `paragraph`**

两章都有，属编辑器残留，可顺手清掉。

### C. 教学效果（优先级中，属内容策略）

**C1. 正文文字量极低 —— 除学习目标和术语表，全章几乎没有说明文字**

| 章节 | 非标题正文总量 | 说明 |
| --- | --- | --- |
| 161 | 首节 311 字 + 术语表 693 字 + 海报说明 48 字 + If 分支说明 114 字 | 所有 Activity 的 h2/h3 段基本 0 字 |
| 162 | 首节 214 字 + 术语表 696 字 + 海报说明 44 字 + PPT 说明 129 字 | 同上 |

后果：**一旦 iframe 挂掉（见 A1/A2），那一节就只剩一块空白 + 一串题目**，学生拿不到任何兜底解释。`skills/03` 本来就要求「每个 h2/h3 下保持 1–2 句话」。建议每个 Activity 下补 1–2 句「这一步要做什么、看什么、交什么」。

**C2. 零代码块**

161 Activity 4 是「Python 分支」教学、Activity 3/5 是 8 对 OJ 解题，162 是 5 对 OJ 解题 —— 全章**没有一处 `codeBlock`**，Python 代码只存在于排序题的 `options` 里。`skills/03` 要求代码示例用带 `language` 的 codeBlock。建议在每个 `### 🧮 P10xx` 下加一小段示范代码块（还能顺带解决 C1 的空白问题）。

**C3. 161 的 Activity 结构比 162 密**

161 在 Activity 3 一口气塞了 1 个游戏 + 7 对 OJ 题（15 个题目节点），162 的 Activity 4 是 5 对。161 那个 Activity 的右侧 TOC 会一次列出 7 条 `🧮 P10xx`，滚动距离很长。可考虑分组或分到两个 Activity。

**C4. 同一份作业被多章共用**

162 的 Activity 3 复用 `homework cid=1`（`P1-H1`，"Submit your presentation PPT to introduce your STEAM project!"），这个名字明显不属于「AI PPT」这一节。建议确认作业的提交/成绩是否按章节隔离，否则容易出现「同一份作业在两个章节各算一次分」。

---

## 三、一句话结论

两章共用一套成熟的模板（同骨架、同节点语汇、同 OJ+排序题配对范式、同分值口径），**结构层面已经对齐**；剩下的问题集中在三处：**外链可用性（A1–A3，真会影响学生）**、**标题风格与文案的细节不统一（B1–B5，几分钟可改完）**、**正文承载量过低导致外链一挂就空白（C1–C2）**。

---

## 附录：本次评审的核查手段

- 内容快照：`select content from chapters where id in (161,162)`
- 结构统计脚本：递归遍历 tiptap doc，统计节点类型、heading `id` 唯一性、`text`/`marks` 合法性、每个 heading 区间的文本量与题目数
- 题目口径：`select cid,type,name,point,options,extra from questions where course_id=5 and cid = any(...)`
- 外链可用性：`curl -s -o /dev/null -w '%{http_code}'`（分别验证带 `-k` / 不带 `-k`，用来区分「服务没起来」和「证书不受信」）
- 版本历史：`select id, created_at, jsonb_array_length(content->'content') from chapter_versions where chapter_id in (161,162) order by id desc`
