# Skill: Write chapter content (tiptap JSON)

> Purpose: write the chapter body as tiptap JSON and save it. The JSON structure maps 1:1 to the renderer
> `modules/lms/components/ueditor/render/` (one node component per file under nodes/). Before writing, check the
> matching node component to confirm attrs/content requirements.
>
> **The content rules in this skill also apply to the "course home content"** (`courses.content`, rendered in the
> "About this course" section of `/course/<id>`) — the structure is identical: root node `{ "type": "doc", "content": [...] }`.
> When creating a course, content must be included (see skills/01); write it according to this skill.

## Chapter heading and length conventions (important)

- Do **not** use level-1 headings (heading level 1) in the chapter body — the chapter title is already shown above
- All content belongs under **level-2 / level-3 headings** so the right-side TOC can navigate and play section by section
- **Keep the content under each level-2/3 heading short** (1–2 paragraphs or 1 code block recommended) for split-screen playback and read-along
- Code examples in codeBlocks must carry a language, e.g. `{ "type": "codeBlock", "attrs": { "language": "python" }, ... }` (without a language it renders as plain text)

### Use plenty of emoji (important)

Use **plenty of emoji** in headings, paragraphs, lists, callouts etc. to make the content livelier and easier to scan (especially effective for primary/secondary students):

- **Emoji in headings**: add a fitting emoji before every level-2/3 heading, e.g. `## 🚀 Variables and Assignment`, `### 🔁 for Loops`
- **Sprinkle in paragraphs/lists**: start or decorate explanatory paragraphs and list items with emoji (e.g. `✅` correct usage, `❌` common mistakes, `⚠️` cautions, `💡` tips, `🎯` learning goals, `📦` examples, `🧪` hands-on)
- **Callout icons**: the `icon` parameter of `:::callout icon=💡` takes an emoji directly, matching the content semantics
- **⚠️ Callout icon is rendered once by the `icon` attribute — do NOT repeat the same emoji inside the callout body**.
  The callout node renders the `icon` attr as a separate leading icon, so writing the same emoji again in the body text
  makes it appear **twice**. Keep the body as plain text, e.g. `:::callout icon=💡\n这里是提示\n:::`.
- **Callout background is applied automatically** (since `utils/markdown.ts` fix, 2026-09): when `bg=` is omitted,
  the conversion fills in the editor-default attrs (`type:"primary"`, `margin:null`,
  `backgroundColor:"rgb(217, 231, 255)"` light blue, `icon:"💡"` if missing). The render component
  (`render/nodes/callout.vue`) binds `attrs.backgroundColor` directly and does **not** apply schema defaults,
  so these attrs must always be present in the JSON. Only pass `bg=` when you want a color other than the default.
- **Moderation first**: emoji should aid understanding; generally 0–2 per paragraph, avoid hurting readability

Markdown example (when passing markdown):

```markdown
## 🎯 Learning Objectives

In this lesson you will learn to:
- ✅ Output text with `print()`
- ⚠️ Avoid mixing straight and curly quotes

:::callout icon=💡
Small tip: spaces in code do not affect execution, but they make code easier to read.
:::
```

### Headings must carry an id (otherwise the right-side TOC is empty)

The right-side TOC (`extractTocFromContent` in `utils/toc.ts`) **only includes heading nodes with `attrs.id`
(or `attrs['data-toc-id']`)** as anchors. The editor adds ids automatically on save, but **content written
directly via the API does not get them**, so add them manually to every heading:

```json
{ "type": "heading", "attrs": { "level": 2, "id": "v2tq2xqel2", "data-toc-id": "v2tq2xqel2" }, "content": [{ "type": "text", "text": "Section title" }] }
```

- `id` and `data-toc-id` can be the same (a unique 10-char lowercase alphanumeric string)
- The render side (`heading.vue`) prefers `attrs.id` for the anchor; TOC clicks smooth-scroll to it
- Symptom of missing ids: headings render fine in the body, but the right-side TOC is blank

### Example skeleton (h2 sections + short blocks)

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2, "id": "abc123def0", "data-toc-id": "abc123def0" }, "content": [{ "type": "text", "text": "Section title one" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "A short explanation..." }] },
    { "type": "codeBlock", "attrs": { "language": "python" }, "content": [{ "type": "text", "text": "print('hello')" }] },
    { "type": "heading", "attrs": { "level": 2, "id": "abc123def1", "data-toc-id": "abc123def1" }, "content": [{ "type": "text", "text": "Section title two" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "Another short explanation..." }] }
  ]
}
```

## Chapter layout template (locked — follow this for every new chapter)

> 本节是 course 5 / chapter 161、162 定稿后固化的排版模式。**新增章节一律照此写**，
> 写完按下面的《自查表》逐条过一遍。目的是让学生在任何一章里都能用同一套视觉线索定位内容。

### The skeleton

```
> <整章概览>                        ← 全章最前面一个 blockquote，在 Learning Objectives 之前
> 1. <本章要点>                      ← 块内紧跟 orderedList，一条对应一个 Activity
> 2. <本章要点>
## 🎯 Learning Objectives          ← h2，有序列表 4–5 条，每条以 emoji 开头，最后一条固定是 (Extra) …
### 📖 Glossary                    ← h3，2 列表格（Term | Definition），约 6 条术语，Term 列带 emoji
## 🧪 Activity 1 <name>            ← h2
  ⬇️ 整段说明放在**一个 blockquote** 里（容器）：
     ▸ 第 1 段 paragraph             ← 一句总述：这一节是什么 / 要做什么
     ▸ 紧跟一个 orderedList          ← 2–4 条步骤，逐行列出，最后一条是「交什么」
### 🎬 <sub-step h3>
### 📸 <sub-step h3>
## 🧪 Activity N (Extra) Finish more   ← 最后一个活动固定叫这个名字
```

### Chapter intro (goes before Learning Objectives)

每一章的 `content[0]` 必须是一个 **blockquote 整章介绍**，位置在 `## 🎯 Learning Objectives` **之前**。
它和 Activity 那层的介绍块**形状一致**（见规则 2）：**先一行概览，再用有序列表逐条列出本章要做什么**。

```json
{
  "type": "blockquote",
  "content": [
    { "type": "paragraph",
      "attrs": {"indent":null,"margin":null,"wordWrap":"normal","textAlign":null,"indentUnit":null,"lineHeight":1.75},
      "content": [{ "type": "text", "text": "📘 In this chapter you will find out how a computer sees a picture." }] },
    { "type": "orderedList",
      "attrs": { "type": null, "start": 1, "margin": null, "listType": "decimal" },
      "content": [
        { "type": "listItem", "attrs": {"indent":null,"indentUnit":null},
          "content": [{ "type": "paragraph", "attrs": {"...":"同 paragraph attrs"},
            "content": [{ "type": "text", "text": "🎨 Try two AI vision demos — one for features, one for edges." }] }] }
      ] }
  ]
}
```

- **第 1 段 paragraph = 概览**：一句话说清这一章讲什么（用学生能懂的说法），以 **📘** 开头。
- **第 2 个节点 = orderedList = 本章要点**：**逐条列出学生这一章要做的事，一条对应一个 Activity**，
  每条以语义 emoji 开头（🎨 体验 / 🖼️ 读材料 / 🎮 游戏 / 💡 概念 / 🤖 工具 / 🏆 额外练习 / 🧮 OJ）。
  条目数与 Activity 数一致（161、162 各 5 条）。
- 顺序不能颠倒，也不能只留概览不留列表（或反过来）。
- Markdown 写法同规则 2：每行都带 `> `（含 `> 1. …`），**不要用空 `>` 行分隔**；或用 `:::blockquote` 围栏包住。
  节点层面它必须是顶层 `content[0]`。

参考（chapter 162）：

```markdown
> 📘 In this chapter you will find out how a computer tells what is inside a picture.
> 1. 🎨 Try the image classification demo and submit a screenshot.
> 2. 🖼️ Read the poster and answer the questions about it.
> 3. 🎮 Play the spot-the-difference game.
> 4. 🤖 Build your own slide deck with the AI PPT tool.
> 5. 🏆 Finish five extra OJ problems, P1011 to P1015.

## 🎯 Learning Objectives
```

### Rules

1. **h2 = Activity，h3 = 子步骤**；正文不出现 h1。
2. **每个 Activity 的 h2 正下方固定放一个 blockquote**，里面装两样东西、顺序不能颠倒：
   - **第 1 段 paragraph**：1 句总述，点出这个 Activity 是什么 / 要做什么（emoji 开头）——
     让学生一眼知道本节主题。
   - **紧跟一个 orderedList**：**逐行列出 2–4 个步骤**，每步一条、以 emoji 开头，
     最后一条通常是「交什么 / 提交到哪」。
   - 不要用一整段说明文字（学生只会扫读）；不要只写总述不列步骤，也不要只列步骤不给总述。

   **节点结构**（一段总述 + 一个有序列表，都在 blockquote 里）：

   ```json
   {
     "type": "blockquote",
     "content": [
       { "type": "paragraph", "attrs": {"indent":null,"margin":null,"wordWrap":"normal","textAlign":null,"indentUnit":null,"lineHeight":1.75},
         "content": [{ "type": "text", "text": "💻 One typing game, then seven OJ problems." }] },
       { "type": "orderedList",
         "attrs": { "type": null, "start": 1, "margin": null, "listType": "decimal" },
         "content": [
           { "type": "listItem", "attrs": {"indent":null,"indentUnit":null},
             "content": [{ "type": "paragraph", "attrs": {"...": "同 paragraph attrs"},
               "content": [{ "type": "text", "text": "🎮 Play the typing game to warm up." }] }] }
         ] }
     ]
   }
   ```

   **Markdown 写法**（两种都验证过等价，**不要用空 `>` 行分隔**）：

   ```markdown
   ## 🧪 Activity 3 Arithmetic OJ Exercise

   > 💻 One typing game, then seven OJ problems.
   > 1. 🎮 Play the typing game to warm up.
   > 2. 🧮 Read the statement of each OJ problem first.
   > 3. 🖱️ Drag the code lines into the correct order.
   ```

   ⚠️ **坑**：在总述和列表之间插一行**空的 `>`**，`markdownToTiptap` 会把它拆成
   *两个* blockquote + 一个内容是 `">"` 的垃圾 paragraph。要么像上面那样每一行都带 `> ` 连续写，
   要么用 `:::blockquote` 围栏包住（围栏内可以用空行）。
3. **每个 heading（h2 + h3）的文字都要带 `marks: [{ type: "bold" }]`**，一个都不能漏。
4. **每个 h3 都要有语义 emoji 前缀**，且**同一角色的子步骤在所有章节里用同一个 emoji**：

   | 子步骤角色 | 固定 emoji | 示例标题 |
   | --- | --- | --- |
   | 体验 / 打开演示 | 🎬 | 🎬 Experience AI Vision |
   | 读海报 / 看材料 | 🖼️ | 🖼️ Read posters |
   | 提问 / 自测 | 🧩（多张材料）或 📝（单张） | 🧩 Questions on Both Posters |
   | 交作业 / 交文件 | 📤 | 📤 Submit your homework |
   | 截图作业 | 📸 | 📸 Submit your screenshot |
   | 分享想法 / 评论 | 💬 | 💬 Share your idea |
   | 小游戏 | 🎮 | 🎮 Type game |
   | OJ 题 | 🧮 | 🧮 P1016 Absolute Value |

   > 「有 emoji」的判定：`\p{Extended_Pictographic}`，或者**数字键盘序列**（`1️⃣` = `1` + U+FE0F + U+20E3）。
   > 分步走流程那种子步骤（`1️⃣ First` … `5️⃣ Fifth`）用 keycap 也算合规，不要为了凑图标改成别的。

5. **Activity 的 emoji 统一用 🧪**（不要混 🌿、🎯 之类）。最后一个活动固定
   `(Extra) Finish more`。
6. **OJ 题统一成一对**：`### 🧮 <pid> <OJ 英文题名>` → OJ 题 → 紧随一道 Code Order 排序题，
   题名从 OJ 接口取，不要自己编（完整规则见 **skills/09**）。
7. **文档结尾不要留空 paragraph**（编辑器会残留一个，保存前删掉）。
8. **所有 heading 的 `id` + `data-toc-id` 必须存在、文档内唯一**，否则右侧 TOC 缺条目
   （校验：`extractTocFromContent` in `modules/lms/utils/toc.ts`）。
9. **不要只靠 iframe / 图片承载内容**：外链一旦不可用（自签证书 → 白屏；http iframe 在 https
   页面下被混合内容拦截），整节就只剩空白 + 一串题目。所以每个 Activity 的 h2 下面必须有那个
   **装着总述 + 步骤列表的 blockquote**（见规则 2）——它同时就是这一节的兜底文字，
   讲代码的节再配一段带 `language` 的 codeBlock。

### Glossary 的写法（两章已统一，照此写）

- **表结构**：2 列 `Term | Definition`，表头行用 `tableHeader`（背景 `rgb(242, 243, 245)`，
  文字加 `bold`），数据行用 `tableCell`；约 6 条术语。
- **Term 列要加语义 emoji 前缀**，且**整门课复用同一套图标**，例如：

  | Term | emoji |
  | --- | --- |
  | Feature Extraction | 🧩 |
  | Image Feature | 🔎 |
  | Edge Detection | ✏️ |
  | Image Edge | 📐 |
  | Python Branching Structure | 🔀 |
  | Conditional Statement | ❓ |
  | Image Classification | 🖼️ |
  | Training Data | 🏷️ |
  | Classification Model | 🧠 |
  | AI Presentation Maker | 📽️ |
  | Content Summarizer | 📝 |
  | Auto‑Design | 🎨 |

- Term 文字本身保持 `bold` mark（和表头一致）。
- **释义统一用技术书面语**：一句话、以名词短语开头（`A …` / `An …` / `The …`），
  `that …` / `used to …` 收在用途上；**不要**写成第二人称讲课口吻
  （❌ "Teaching a computer to look at a picture and tell you what it shows"）。
  正例：`A core computer vision task that assigns an input image to one of several predefined categories.`
- 度量：每条释义约 12–20 词，全章语气一致（这是同一个作者写的同一个术语表）。

### Self-check table (run before saving)

| 检查项 | 不合格的样子 | 合格的样子 |
| --- | --- | --- |
| 全章开头有整章介绍 blockquote | 文档第一个节点就是 `## 🎯 Learning Objectives` | `content[0]` = 一个 blockquote，内含 `[概览 paragraph, 要点 orderedList]` → 然后才是 Learning Objectives |
| Activity 下方是一个 blockquote（内装总述 + 有序列表） | h2 下面直接接 h3（整节 0 字），或只丢一整段说明文字，或把 blockquote 与 orderedList 拆成两个顶层节点 | h2 → 一个 blockquote，其中 `[总述 paragraph, 步骤 orderedList]` |
| h3 有 emoji | `Submit your homework` / `Read posters` / `Type game` | `📤 Submit your homework` / `🖼️ Read posters` / `🎮 Type game` |
| heading 有 bold mark | heading 的 text 节点 `marks: []` | `marks: [{ type: "bold" }]` |
| emoji 跨章一致 | 这章 `🖼️ Read posters`、那章 `📖 Read posters` | 两章都用 🖼️ |
| Activity emoji 一致 | `## 🌿 Activity 4 …` 混在 🧪 里 | `## 🧪 Activity 4 …` |
| h3 标题范围与内容相符 | `Questions on the Feature Extraction poster` 下挂了 6 题（含另一张海报的题） | 标题写清范围，或拆成两个 h3 |
| OJ h3 带题名 | `### P1016 `（末尾还有空格） | `### 🧮 P1016 Absolute Value` |
| 拼写 | `Experience AI vison` | `Experience AI vision` |
| 文末无空段 | 最后一个节点是空 `paragraph` | 最后节点是内容节点 |
| heading id 唯一 | 两个 heading 共用同一个 id | 每个 heading 一个唯一 id |
| Glossary 的 Term 带 emoji | `Feature Extraction`（裸文字） | `🧩 Feature Extraction` |
| Glossary 释义语气统一 | 一章书面语、一章 `Teaching a computer to look at a picture…` | 全章都用 `A … that …` / `The … used to …` |

### 排版体检

自检脚本在本文末尾的 **Post-generation self-check → Quick validation script** 一处维护（已包含
heading 缺 id / 缺 bold / 缺 emoji / id ≠ data-toc-id 这几条），不要在别处再抄一份。

## Save endpoints

`POST /api/chapters/update` (admin or the chapter's teacher)

```json
{
  "id": 11,
  "content": {
    "type": "doc",
    "content": []
  }
}
```

- `content` is the full tiptap doc JSON (root fixed at `{ type: 'doc', content: [...] }`)
- On save the server automatically: ① snapshots the old content into versions; ② extracts the ids of
  question/homework/comment/quiz vue nodes from the content into the chapter fields (questionIds etc.)
- Optionally pass other fields in the same body (e.g. `isOpen`)

### ⭐ Save endpoints accept markdown strings directly (no local scripts needed)

The **add / update** endpoints of `courses` and `chapters` accept a **markdown string** for `content`
(not only tiptap JSON). The server (`normalizeContent` in `server/utils/content.ts`) calls `markdownToTiptap`
to convert it into doc JSON and adds `id`/`data-toc-id` to every heading (right-side TOC works). Example:

```json
{
  "id": 11,
  "content": "## Section title\n\nThis is **markdown**.\n\n:::callout icon=💡\nTip content\n:::\n"
}
```

- A string → converted to tiptap automatically; an object (already doc JSON) → saved as-is
- Rich component `:::` fences / tables / formulas and other markdown syntax (same syntax the AI generator uses) can be written directly in the string
- To embed questions: first create the question via `POST /api/questions/add` to get a cid, then handle
  `:::question {json}:::` like the chapter flow — note the question itself still goes through `/api/questions/add`;
  the `:::question` syntax only works in the editor / AI streaming
- Suitable for: normal users (no source code, cannot run node scripts) or scripts that deliver content as markdown

## Common tiptap JSON structure

- **doc root**: `{ "type": "doc", "content": [block nodes...] }`
- **Block nodes** (may contain child content): paragraph / heading / blockquote / bulletList /
  orderedList / listItem / taskList / taskItem / codeBlock / horizontalRule /
  pageBreak / table / tableRow / tableCell / tableHeader / column / columnContainer /
  details / detailsSummary / detailsContent / callout / textBox / toc / echarts /
  blockMath / vue etc.
- **Text nodes**: `{ "type": "text", "text": "content", "marks": [...] }`
  - Optional marks: `{ "type": "bold" }` / `{ "type": "italic" }` / `{ "type": "strike" }` /
    `{ "type": "code" }` / `{ "type": "textStyle", "attrs": { "color": "#f00", "fontSize": "18px" } }`
- **Inline nodes**: image / inlineImage / video / audio / file / iframe / tag / datetime /
  mention / optionBox / footnoteReference / inlineMath / vue (inline)
- **Image and other asset references**: always use in-site URLs (`/api/files/serve?pathname=...`). External images
  must go through `POST /api/files/upload` first (JSON body `{ "url": "<external image url>" }`;
  the server downloads and converts to webp) and then uses the returned `data.url` — see **skills/07-file-upload.md**

## Common node examples

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Level 1 heading" }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Level 2 heading" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "A plain paragraph, " }, { "type": "text", "text": "bold", "marks": [{ "type": "bold" }] }, { "type": "text", "text": ", " }, { "type": "text", "text": "inline code", "marks": [{ "type": "code" }] }] },
    {
      "type": "bulletList",
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Unordered item 1" }] }] },
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Unordered item 2" }] }] }
      ]
    },
    {
      "type": "orderedList",
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Ordered item 1" }] }] }
      ]
    },
    { "type": "codeBlock", "content": [{ "type": "text", "text": "print('hello')" }] },
    { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Quoted content" }] }] },
    { "type": "horizontalRule" },
    {
      "type": "table",
      "content": [
        { "type": "tableRow", "content": [
          { "type": "tableHeader", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Column A" }] }] },
          { "type": "tableHeader", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Column B" }] }] }
        ]},
        { "type": "tableRow", "content": [
          { "type": "tableCell", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "1" }] }] },
          { "type": "tableCell", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "2" }] }] }
        ]}
      ]
    },
    {
      "type": "taskList",
      "content": [
        { "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "To do" }] }] }
      ]
    }
  ]
}
```

- Image node: `{ "type": "image", "attrs": { "src": "<url>", "alt": "...", "title": "..." } }` (use an in-site URL such as `/api/files/serve` after upload)
- Math formulas (KaTeX rendering): the formula lives in **`attrs.latex`** (not content):
  - Block: `{ "type": "blockMath", "attrs": { "latex": "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" } }`
  - Inline: `{ "type": "inlineMath", "attrs": { "latex": "\\alpha^2 + \\beta^2 = \\gamma^2" } }` (as a content child of a paragraph)

## Rich component nodes (extension blocks under render/nodes) and markdown syntax

These extension components (callout/details/iframe/image/taskList/columns/echarts/html/tabs/stepper/vfiles/sheet/mindmap etc.)
**cannot be expressed by plain markdown**; the editor carries them with the `:::type params ... :::` fence syntax
(parsed by `utils/markdown.ts`; the AI generator uses the same syntax to reach them):

### Basic rich components (body block nodes)

| Component | Markdown syntax | Generated tiptap node |
| --- | --- | --- |
| callout | `:::callout icon=💡 bg=#eff6ff` `content` `:::` | `{type:"callout", attrs:{icon, type:"primary", margin:null, backgroundColor, fontColor?}, content:[blocks]}` — `bg` 默认 `rgb(217, 231, 255)`，`icon` 默认 `💡`；attrs 恒与编辑器产出结构对齐 |
| details (collapsible) | `:::details title=Expand open=1` `content` `:::` | `{type:"details", content:[{type:"detailsSummary",content:[blocks]},{type:"detailsContent",content:[blocks]}]}` |
| iframe embed | `:::iframe src=https://... height=300` `:::` | `{type:"iframe", attrs:{src,height}}` (height defaults to 200) |
| image | `:::image src=https://... alt=caption` `:::` | `{type:"image", attrs:{src,alt,title}}` |
| taskList | `:::tasklist` `- [x] done` `- [ ] to do` `:::` | `{type:"taskList", content:[{type:"taskItem",attrs:{checked},content:[blocks]}]}` |
| blockquote | `> content` | `{type:"blockquote", content:[blocks]}` |

### Rich components (column / echarts)

| Component | Markdown syntax | Generated tiptap node |
| --- | --- | --- |
| columns | `:::columns` with several `:::col width=200` `content` `:::` then `:::` | `{type:"columnContainer", content:[{type:"column",attrs:{colWidth},content:[blocks]},...]}` |
| echarts chart | `:::echarts height=300` + `ECharts option JSON` `:::` | `{type:"echarts", attrs:{chartOptions:<obj>, height}}` |

Column example (`:::` fences nest; only `:::columns/:::col` need nesting; counting: `:::xxx` opens +1, a bare `:::` closes -1 until 0):

```
:::columns
:::col width=260
**Left column**: key points
- Apple
- Banana
:::
:::col width=200
**Right column**: quote
> Python is great
:::
:::
```

echarts example (the body is a complete ECharts option, a JSON object):

```
:::echarts height=280
{"tooltip":{},"series":[{"name":"Score","type":"pie","radius":"55%","data":[{"value":80,"name":"Chinese"},{"value":72,"name":"English"}]}]}
:::
```

### Rich components (custom vue-style: tabs / stepper / vfiles / html / sheet)

These generate `vue` nodes: `{ "type": "vue", "attrs": { "type": "<subtype>", "content": "<JSON string>" } }`.
The subtype name = the fence type (`tabs`/`stepper`/`vfiles`/`html`/`sheet`).

| Component | Markdown syntax | JSON inside content (attrs.content) |
| --- | --- | --- |
| tabs | `:::tabs` with one `## Tab name` + its markdown per tab `:::` | `{"tabs":[{"label":"...","content":<doc tiptap>}]}` |
| stepper | `:::stepper orientation=horizontal` with one `## Step title` + description each `:::` | `{"orientation":"horizontal","steps":[{"title":"...","description":<doc tiptap>}]}` |
| vfiles | `:::vfiles` with one `## File name` + content each `:::` | `{"items":[{"id":"<short id>","label":"...","type":"file","content":<doc tiptap>}]}` |
| html block | `:::html height=150` + raw HTML `:::` | attrs.content = the HTML **string** (not JSON) |
| sheet (spreadsheet) | `:::sheet height=220` + markdown table `:::` | `{"height":220,"cellData":{<row>:{<col>:{"v":".."}}}}` |
| mindmap | `:::mindmap` + markdown (`# title` or indented `- list` for levels) `:::` | attrs.content = the raw **markdown string** (parsed by simple-mind-map) |

Syntax examples:

````
:::tabs
## Overview
This is the **Overview** tab.
## Code
```python
print("hi")
```
:::

:::stepper orientation=horizontal
## Type
Learn to open the editor first
## Run
Click run to see the result
:::

:::vfiles
## main.py
print("Hello, Python")
## README.md
This is a readme file.
:::

:::html height=160
<h3 style="color:#1d7d48">HTML card</h3>
:::

:::sheet height=220
| Name | Chinese | Math |
| --- | --- | --- |
| Amy | 95 | 90 |
| Ben | 88 | 85 |
:::

:::mindmap
# Learning Python
## Basics
### Variables
### Loops
## Advanced
### Functions
#### return
:::
````

> Note: the `## sub-titles` inside `tabs`/`stepper`/`vfiles` only split the blocks and **never** become body headings;
> write real body headings with `###` (or `##`) inside each block. `html` content is a raw HTML string.

- Opening fence: `:::type params`, parameters separated by spaces as `key=value` (e.g. `title=Expand open=1`, `bg=#eff6ff`); close with a bare `:::` line
- `:::` fences **can nest** (only `:::columns/:::col` need it; counting: `:::xxx` opens +1, a bare `:::` closes -1 until 0)
- The fence body can be any markdown (headings/lists/formulas etc.) and becomes the component's `content` as a whole
- All of these markdown syntaxes are also written into `ueditor/prompt.js` so the AI generator can produce them

## Embedded interactive nodes (vue nodes) — question / homework / quiz / comment

> Creation APIs for homework / quiz / race / comment are in skills/06; this section only covers question creation.

```json
{
  "type": "vue",
  "attrs": { "type": "question", "content": "12" }
}
```

- `attrs.type` supports every type under `ueditor/extensions/nodes/vue/*`:
  `question`, `homework`, `quiz`, `race`, `comment`, `aichat`, `chatroom`, `html`, `pdf`, `office`, `mindmap` etc.
- `attrs.content` is the entity's `cid` (the in-course cid of the question/homework etc., as a string)
- On save these ids are extracted into `chapters.questionIds/homeworkIds/quizIds/commentIds`

## Companion step: create questions first, then embed

Questions go through `POST /api/questions/add` (teacher/admin), body:

```json
{
  "course_id": 1,
  "name": "Question name",
  "type": "single",
  "content": { "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Question stem" }] }] },
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "answer": [0],
  "point": 5,
  "explanation": { "type": "doc", "content": [] }
}
```

- `content` (stem) and `explanation` are tiptap doc JSON; `content` as a string is only for the html type
- On success the response contains `data.cid` (the in-course question number); use it in the chapter's vue node

### Question types and answer/options formats (answer is always an array)

| type | options | answer example | notes |
| --- | --- | --- | --- |
| single | array of option strings | `[0]` | single choice, answer is the index |
| multiple | array of option strings | `[0, 2]` | multiple choice, several indexes |
| judge | `["✓ Correct","✗ Wrong"]` | `[0]` correct / `[1]` wrong | true/false. ⚠️ Use the library convention `✓ Correct` / `✗ Wrong` (existing questions in production all use it); plain `["Correct","Wrong"]` works but is inconsistent |
| fill | `["", "", ""]` or `["regex"]` | `["answer1","answer2"]` | fill-in: **content must contain an `inputs` node** (`attrs.content` holds each blank's answer), one per blank |
| select | array of dropdown options | `["Option text"]` | dropdown: **content must contain a `select` node** (`attrs.content` holds the answer text) |
| sort | array of items (in correct order) | `[0,1,2,3]` | ordering, answer is the correct order of indexes |
| classify | `[{name, items:[...]}, ...]` | `[0,0,1,1]` | classification, answer is the category index per item (flattened) |
| match | `[{left, right}, ...]` | `[0,1,2]` | matching, answer is the correct order of the right column |
| puzzle | `{ "url": "<image url>", "split": 3 }` | `[0,1,...,8]` | jigsaw, answer is each tile's correct position |
| html | `[]` | `[1]` | **content holds a raw HTML string**; judged inside an iframe via `parent.postMessage({ type: 'correct_rate', rate: 0|1 }, '*')` |
| short-answer | `[]` | `["^regex$"]` | short answer, answer[0] is a regular expression |
| composite | `[]` | `[]` | composite: **content holds an array of sub-questions** (each with type/name/content/options/answer/point); leave answer empty |
| video | `{ "src": "<video url>", "questions": [{cid, at}] }` | `[]` | video: passes after watching ≥95% and answering the pop-up questions; without pop-ups, watching is enough |
| evaluation | `{ "goal": "...", "threshold": 0.5 }` | `[]` | evaluation: AI conversation scoring; passes when progress ≥ threshold |
| oj | `{ "pid": "" }` | `[]` | OJ (external judge integration, needs separate setup) |

### Inline nodes in fill / select stems (error-prone)

- **fill**: the input box in the stem = an `inputs` node, the answer in `attrs.content`:

```json
{ "type": "paragraph", "content": [
  { "type": "text", "text": "Inline code is wrapped in " },
  { "type": "inputs", "attrs": { "content": "backticks" } },
  { "type": "text", "text": "." }
] }
```

- **select**: the dropdown in the stem = a `select` node, the answer in `attrs.content` (must be one of the options):

```json
{ "type": "paragraph", "content": [
  { "type": "text", "text": "Choose the image syntax: " },
  { "type": "select", "attrs": { "content": "![caption](image url)" } }
] }
```

> Missing these nodes means: no input box / dropdown while answering, and the answer cannot be extracted from content for grading.

### Showing markdown syntax inside options (important)

Option strings are rendered as markdown. If an option itself demonstrates markdown syntax
(such as `---`, `**text**`, `# heading`, `` `code` ``, `[text](url)`, `- list`, `> quote`),
wrap it in a ```markdown fence so it displays literally:

```json
"options": ["```markdown\n---\n```", "```markdown\n**text**\n```"]
```

- If the option content contains ``` use a **4-backtick** fence ````markdown` instead, so the content's ``` does not close it early
- Only single/multiple-choice options need this; sort/classify/match/select/judge options are plain-text interpolated, no wrapping needed

## Suggested order

1. Create questions (collect cids) → 2. Assemble the tiptap JSON (vue nodes referencing cids) → 3. Save content via `POST /api/chapters/update`

## Post-generation self-check (mandatory — verify every rule after generating JSON)

After generating chapter content or a question, **before saving** run a script that recursively checks the rules below; any violation must be fixed:

| Rule | Wrong example | Correct example |
| --- | --- | --- |
| ① text node `text` must be a string | `{"type":"text","text":{"type":"text","text":"content"}}` (double nesting) | `{"type":"text","text":"content"}` |
| ② heading must carry `id` and `data-toc-id` | `{"type":"heading","attrs":{"level":2}}` (TOC empty) | `{"type":"heading","attrs":{"level":2,"id":"abc...","data-toc-id":"abc..."}}` |
| ③ codeBlock must carry `language` | `{"type":"codeBlock","content":[...]}` (rendered as plain text) | `{"type":"codeBlock","attrs":{"language":"markdown"},...}` |
| ④ text `marks` must be an array | `marks: {marks:[{type:'bold'}]}` (marks is not iterable) | `marks: [{type:'bold'}]` |
| ⑤ fill stems need an `inputs` node; select stems need a `select` node | stem is text only (no input box) | `{"type":"inputs","attrs":{"content":"answer"}}` / `{"type":"select","attrs":{"content":"option"}}` |
| ⑥ single/multiple options containing markdown must be wrapped in a ```markdown fence | option written as `---`, `**text**` directly (gets rendered) | `"```markdown\n**text**\n```"` |
| ⑦ every heading text must carry a `bold` mark | heading text node with `marks: []` | `marks: [{type:"bold"}]` |
| ⑧ every heading must start with a semantic emoji | `Submit your homework` / `Read posters` | `📤 Submit your homework` / `🖼️ Read posters` |
| ⑨ every Activity h2 must be followed by one blockquote holding `[paragraph, orderedList]` | h2 → h3 directly; a single prose paragraph; or blockquote and orderedList as two sibling top-level nodes | h2 → blockquote → `[总述 paragraph, 步骤 orderedList]` |
| ⑩ no trailing empty paragraph at the end of the doc | last node is an empty `paragraph` | last node is a content node |
| ⑪ the doc must open with the chapter-intro blockquote holding `[paragraph, orderedList]` | `content[0]` is `## 🎯 Learning Objectives`; or the intro blockquote has only a paragraph | `content[0]` = blockquote `[概览 paragraph, 要点 orderedList]` → `content[1]` = Learning Objectives |

### Quick validation script (recursively checks ①②③④⑤⑦⑧, top-level ⑨⑩⑪)

Run against the final content JSON; it lists violations:

```js
/** 顶层排版检查：⑨ Activity 结构 / ⑩ 文末空段 / ⑪ 整章介绍 blockquote */
function validateChapterLayout(content) {
  const issues = []
  const nodes = content?.content || []
  const txt = (n) => (!n || typeof n !== 'object') ? '' : n.type === 'text' ? (n.text || '') : Array.isArray(n.content) ? n.content.map(txt).join('') : typeof n.content === 'object' ? txt(n.content) : ''
  // ⑪ 开头必须是整章介绍 blockquote（概览 paragraph + 要点 orderedList），紧接着才是 Learning Objectives
  const first = nodes[0]
  if (!first || first.type !== 'blockquote') issues.push('⑪ doc does not start with the chapter-intro blockquote')
  else {
    const k = (first.content || []).map(c => c.type)
    if (k[0] !== 'paragraph') issues.push('⑪ chapter-intro blockquote first child is not an overview paragraph')
    if (k[1] !== 'orderedList') issues.push('⑪ chapter-intro blockquote has no orderedList of chapter points')
    else if ((first.content[1].content || []).length < 2) issues.push('⑪ chapter-intro orderedList needs >=2 items')
  }
  if (!(nodes[1] && nodes[1].type === 'heading' && /Learning Objectives/.test(txt(nodes[1])))) issues.push('⑪ chapter-intro is not immediately followed by Learning Objectives')
  // ⑨ 每个 Activity h2 下面必须是一个 blockquote，内含 [paragraph, orderedList]
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (!(n.type === 'heading' && n.attrs?.level === 2 && /Activity \d/.test(txt(n)))) continue
    const a = nodes[i + 1]
    const kids = a && a.type === 'blockquote' ? (a.content || []) : []
    if (a?.type !== 'blockquote') issues.push('⑨ Activity has no intro blockquote: ' + txt(n))
    else if (kids[0]?.type !== 'paragraph') issues.push('⑨ intro blockquote first child is not a paragraph: ' + txt(n))
    else if (kids[1]?.type !== 'orderedList') issues.push('⑨ intro blockquote has no orderedList: ' + txt(n))
    else if ((kids[1].content || []).length < 2) issues.push('⑨ orderedList needs >=2 items: ' + txt(n))
    if (a && (a.type === 'orderedList' || nodes[i + 2]?.type === 'orderedList')) issues.push('⑨ intro blockquote and list must not be siblings: ' + txt(n))
  }
  // ⑩ 文末不能是空 paragraph
  const last = nodes[nodes.length - 1]
  if (last && last.type === 'paragraph' && !txt(last).trim()) issues.push('⑩ trailing empty paragraph')
  return issues
}
```

节点级检查（①②③④⑤⑦⑧，递归遍历每个节点）：

```js
function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks is not an array')
  }
  if (node.type === 'heading') {
    const t = node.content?.[0]?.text || ''
    if (!node.attrs?.id) issues.push('heading missing id: ' + t)
    if (node.attrs?.id !== node.attrs?.['data-toc-id']) issues.push('heading id !== data-toc-id: ' + t)
    if (!(node.content?.[0]?.marks || []).some(m => m.type === 'bold')) issues.push('heading missing bold: ' + t)
    if (!(/\p{Extended_Pictographic}/u.test(t) || /\u20E3/u.test(t))) issues.push('heading missing emoji: ' + t)
  }
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach(n => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}
```

> ⑤ is validated at the question level: for fill, `JSON.stringify(content).includes('"inputs"')` must be true; for select, check `'"select"'` the same way.
> ⑨⑩⑪ are top-level checks: `validateChapterLayout(content)` — Activity 结构、文末空段、整章介绍 blockquote。
