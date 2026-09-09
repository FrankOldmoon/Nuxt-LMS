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
| judge | `["Correct","Wrong"]` | `[0]` correct / `[1]` wrong | true/false |
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

### Quick validation script (recursively checks ①②③④⑤)

Run against the final content JSON; it lists violations:

```js
function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text is not a string')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks is not an array')
  }
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading missing id')
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock missing language')
  if (Array.isArray(node.content)) node.content.forEach(n => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}
```

> ⑤ is validated at the question level: for fill, `JSON.stringify(content).includes('"inputs"')` must be true; for select, check `'"select"'` the same way.
