# Skill: 给某个 chapter 创建内容（tiptap JSON）

> 用途：把章节正文写成 tiptap JSON 并保存。JSON 结构与渲染器
> `modules/lms/components/ueditor/render/`（nodes/ 下每个文件一种节点）一一对应，
> 写之前可对照对应节点组件确认 attrs/content 要求。
>
> **本 skill 的 content 规则同样适用于"课程首页 content"**（`courses.content`，渲染在
> `/course/<id>` 的"关于课程"区）——结构完全一致：根节点 `{ "type": "doc", "content": [...] }`。
> 创建课程时必须带 content（见 skills/01），写法按本 skill 规则来。

## 章节内容标题与篇幅规范（重要）

- 章节正文**不要用一级标题（heading level 1）**——文档上方已自带章节标题
- 内容全部归属**二级（level 2）/ 三级（level 3）标题**，方便右侧 toc 导航与逐段播放
- **每个二级/三级标题下的内容不能太多**（建议 1~2 个段落或 1 个代码块），便于分屏播放与跟读
- 代码示例的 codeBlock 必须带语言，如 `{ "type": "codeBlock", "attrs": { "language": "python" }, ... }`（不带 language 会按纯文本渲染）

### 标题必须带 id（否则右侧 TOC 不显示）

右侧 TOC（`utils/toc.ts` 的 `extractTocFromContent`）**只收录带 `attrs.id`（或
`attrs['data-toc-id']`）的 heading 节点**作为锚点。编辑器保存时会自动补 id，
但**直接 API 写入的 content 不会**，因此每个 heading 都要手动带上：

```json
{ "type": "heading", "attrs": { "level": 2, "id": "v2tq2xqel2", "data-toc-id": "v2tq2xqel2" }, "content": [{ "type": "text", "text": "小节标题" }] }
```

- `id` 与 `data-toc-id` 相同即可（10 位小写字母数字唯一字符串）
- 渲染端 `heading.vue` 锚点优先用 `attrs.id`，TOC 点击可平滑跳转
- 漏掉 id 的症状：正文里标题正常显示，但右侧 TOC 空白

### 示例骨架（h2 组织 + 精简小节）

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2, "id": "abc123def0", "data-toc-id": "abc123def0" }, "content": [{ "type": "text", "text": "小节标题一" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "一小段讲解……" }] },
    { "type": "codeBlock", "attrs": { "language": "python" }, "content": [{ "type": "text", "text": "print('你好')" }] },
    { "type": "heading", "attrs": { "level": 2, "id": "abc123def1", "data-toc-id": "abc123def1" }, "content": [{ "type": "text", "text": "小节标题二" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "另一小段讲解……" }] }
  ]
}
```

## 保存入口

`POST /api/chapters/update`（管理员或该章节任课教师）

```json
{
  "id": 11,
  "content": {
    "type": "doc",
    "content": []
  }
}
```

- `content` 是完整 tiptap doc JSON（根节点固定 `{ type: 'doc', content: [...] }`）
- 保存时服务端自动：①旧内容存版本快照；②从 content 提取 vue 节点里的
  question/homework/comment/quiz 的 id 写入章节对应字段（questionIds 等）
- 可选同 body 携带其它字段（如 `isOpen`）

### ⭐ 保存入口直接支持 markdown 字符串（无需本机跑脚本）

`courses` 与 `chapters` 的 **add / update** 接口，`content` 都可以**直接传 markdown
字符串**（不只是 tiptap JSON）。服务端（`server/utils/content.ts` 的
`normalizeContent`）会调用 `markdownToTiptap` 自动转成 doc JSON，并给所有
heading 补 `id`/`data-toc-id`（右侧 TOC 可用）。例：

```json
{
  "id": 11,
  "content": "## 小节标题\n\n这是一段 **markdown**。\n\n:::callout icon=💡\n提示内容\n:::\n"
}
```

- 传字符串 → 自动转 tiptap；传对象（已是 doc JSON）→ 原样保存
- 富组件 `:::` 围栏 / 表格 / 公式等 markdown 语法与 AI 生成一致，均可直接写在字符串里
- 需要嵌题目时：先 `POST /api/questions/add` 建题拿 cid，再把
  `:::question {json}:::` 或字符串里的问题按章节方式处理——注意题目本身仍需走
  `/api/questions/add`，`:::question` 语法只在编辑器/AI 流式里可用
- 适用于：普通用户（无源代码、无法跑 node 脚本）或脚本直接以 markdown 交付内容

## Tiptap JSON 通用结构

- **doc 根**：`{ "type": "doc", "content": [块级节点...] }`
- **块级节点**（可含子节点 content）：paragraph / heading / blockquote / bulletList /
  orderedList / listItem / taskList / taskItem / codeBlock / horizontalRule /
  pageBreak / table / tableRow / tableCell / tableHeader / column / columnContainer /
  details / detailsSummary / detailsContent / callout / textBox / toc / echarts /
  blockMath / vue 等
- **文本节点**：`{ "type": "text", "text": "内容", "marks": [...] }`
  - marks 可选：`{ "type": "bold" }` / `{ "type": "italic" }` / `{ "type": "strike" }` /
    `{ "type": "code" }` / `{ "type": "textStyle", "attrs": { "color": "#f00", "fontSize": "18px" } }`
- **行内节点**：image / inlineImage / video / audio / file / iframe / tag / datetime /
  mention / optionBox / footnoteReference / inlineMath / vue（行内版）

## 常用节点示例

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "一级标题" }] },
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "二级标题" }] },
    { "type": "paragraph", "content": [{ "type": "text", "text": "普通段落，" }, { "type": "text", "text": "加粗", "marks": [{ "type": "bold" }] }, { "type": "text", "text": "，" }, { "type": "text", "text": "行内代码", "marks": [{ "type": "code" }] }] },
    {
      "type": "bulletList",
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "无序项1" }] }] },
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "无序项2" }] }] }
      ]
    },
    {
      "type": "orderedList",
      "content": [
        { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "有序项1" }] }] }
      ]
    },
    { "type": "codeBlock", "content": [{ "type": "text", "text": "print('hello')" }] },
    { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "引用内容" }] }] },
    { "type": "horizontalRule" },
    {
      "type": "table",
      "content": [
        { "type": "tableRow", "content": [
          { "type": "tableHeader", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "列A" }] }] },
          { "type": "tableHeader", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "列B" }] }] }
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
        { "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "待办" }] }] }
      ]
    }
  ]
}
```

- 图片节点：`{ "type": "image", "attrs": { "src": "<url>", "alt": "...", "title": "..." } }`（文件上传后走 `/api/files/serve` 之类的 URL）
- 数学公式（KaTeX 渲染）：公式内容存在 **`attrs.latex`**（不是 content）：
  - 块级：`{ "type": "blockMath", "attrs": { "latex": "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" } }`
  - 行内：`{ "type": "inlineMath", "attrs": { "latex": "\\alpha^2 + \\beta^2 = \\gamma^2" } }`（作为 paragraph 的 content 子节点）

## 富组件节点（render/nodes 下的扩展块）与 markdown 语法

这些扩展组件（callout/details/iframe/image/taskList/columns/echarts/html/tabs/stepper/vfiles/sheet/mindmap 等）
**普通 markdown 表达不了**，编辑器用 `:::类型 参数 ... :::` 围栏语法承载
（`utils/markdown.ts` 解析，AI 生成文档时用同一语法触达它们）：

### 基础富组件（正文块级节点）

| 组件 | markdown 写法 | 生成的 tiptap 节点 |
| --- | --- | --- |
| callout 提示框 | `:::callout icon=💡 bg=#eff6ff` `内容` `:::` | `{type:"callout", attrs:{icon,backgroundColor,fontColor}, content:[块]}` |
| details 折叠 | `:::details title=展开查看 open=1` `内容` `:::` | `{type:"details", content:[{type:"detailsSummary",content:[块]},{type:"detailsContent",content:[块]}]}` |
| iframe 内嵌 | `:::iframe src=https://... height=300` `:::` | `{type:"iframe", attrs:{src,height}}`（height 默认 200） |
| image 图片 | `:::image src=https://... alt=说明` `:::` | `{type:"image", attrs:{src,alt,title}}` |
| taskList 任务列表 | `:::tasklist` `- [x] 已完成` `- [ ] 待办` `:::` | `{type:"taskList", content:[{type:"taskItem",attrs:{checked},content:[块]}]}` |
| blockquote 引用 | `> 内容` | `{type:"blockquote", content:[块]}` |

### 富组件（column / echarts）

| 组件 | markdown 写法 | 生成的 tiptap 节点 |
| --- | --- | --- |
| column 分栏 | `:::columns` 内多个 `:::col width=200` `内容` `:::` 再 `:::` | `{type:"columnContainer", content:[{type:"column",attrs:{colWidth},content:[块]},...]}` |
| echarts 图表 | `:::echarts height=300` + `ECharts option JSON` `:::` | `{type:"echarts", attrs:{chartOptions:<obj>, height}}` |

分栏写法示例（`:::` 支持嵌套，`:::col` 内可放任意 markdown）：

```
:::columns
:::col width=260
**左列**：要点列表
- 苹果
- 香蕉
:::
:::col width=200
**右列**：引用
> Python 很棒
:::
:::
```

echarts 写法示例（正文是完整 ECharts option，JSON 对象）：

```
:::echarts height=280
{"tooltip":{},"series":[{"name":"得分","type":"pie","radius":"55%","data":[{"value":80,"name":"语文"},{"value":72,"name":"英语"}]}]}
:::
```

### 富组件（自定义 vue 式组件，tabs / stepper / vfiles / html / sheet）

这几个生成的是 `vue` 节点：`{ "type": "vue", "attrs": { "type": "<子类型>", "content": "<JSON 字符串>" } }`。
子类型名 = 围栏类型名（`tabs`/`stepper`/`vfiles`/`html`/`sheet`）。

| 组件 | markdown 写法 | content 里的 JSON（attrs.content） |
| --- | --- | --- |
| tabs 标签页 | `:::tabs` 内每个 `## 标签名` + 自己内容的 markdown `:::` | `{"tabs":[{"label":"...","content":<doc tiptap>}]}` |
| stepper 分步 | `:::stepper orientation=horizontal` 内每个 `## 步标题` + 描述 `:::` | `{"orientation":"horizontal","steps":[{"title":"...","description":<doc tiptap>}]}` |
| vfiles 文件 | `:::vfiles` 内每个 `## 文件名` + 内容 `:::` | `{"items":[{"id":"<短id>","label":"...","type":"file","content":<doc tiptap>}]}` |
| html 代码块 | `:::html height=150` + 原始 HTML `:::` | attrs.content = HTML **字符串**（非 JSON） |
| sheet 电子表格 | `:::sheet height=220` + markdown 表格 `:::` | `{"height":220,"cellData":{<row>:{<col>:{"v":".."}}}}` |
| mindmap 思维导图 | `:::mindmap` + markdown（`# 标题` 或缩进 `- 列表` 表达层级）`:::` | attrs.content = 原始 **markdown 字符串**（simple-mind-map 解析） |

写法示例：

````
:::tabs
## 概览
这是**概览**标签页的内容。
## 代码
```python
print("hi")
```
:::

:::stepper orientation=horizontal
## 打字
先学会打开编辑器
## 运行
点击运行看结果
:::

:::vfiles
## main.py
print("你好，Python")
## 说明.md
这是一份说明文件。
:::

:::html height=160
<h3 style="color:#1d7d48">HTML 卡片</h3>
:::

:::sheet height=220
| 姓名 | 语文 | 数学 |
| --- | --- | --- |
| 小明 | 95 | 90 |
| 小红 | 88 | 85 |
:::

:::mindmap
# Python 学习
## 基础
### 变量
### 循环
## 进阶
### 函数
#### return
:::
````

> 说明：`tabs`/`stepper`/`vfiles` 里的 `## 小标题` 只用于切分区块，**不会**变成正文标题；
> 每个区块内部再用 `###`（或 `##`）写正文标题。`html` 的 content 是原始 HTML 字符串。

- 开围栏格式：`:::类型 参数`，参数用 `key=value` 空格分隔（如 `title=展开 open=1` `bg=#eff6ff`）；闭合用单独一行的 `:::`
- `:::` 围栏**可嵌套**（仅 `:::columns/:::col` 需要嵌套；嵌套计数：`:::xxx` 开 +1，单独 `:::` -1 到 0 才结束）
- 围栏内可以是任意 markdown（标题/列表/公式等），会整体作为该组件的 `content`
- 以上所有组件对应的 markdown 语法已写入 `ueditor/prompt.js`，AI 生成文档时即可产出

## 嵌入互动节点（vue 节点）——题目/作业/测验/评论

```json
{
  "type": "vue",
  "attrs": { "type": "question", "content": "12" }
}
```

- `attrs.type` 支持目录 `ueditor/extensions/nodes/vue/*` 下所有类型：
  `question`（题目）、`homework`（作业）、`quiz`（测验）、`race`（抢答）、`comment`（评论区）、`aichat`、`chatroom`、`html`、`pdf`、`office`、`mindmap` 等
- `attrs.content` 是对应实体的 `cid`（题目/作业等课程内 cid，字符串）
- 保存章节时这些 id 会被自动提取到 `chapters.questionIds/homeworkIds/quizIds/commentIds`

## 配套：先创建题目再嵌入

题目走 `POST /api/questions/add`（教师/管理员），body：

```json
{
  "course_id": 1,
  "name": "题目名称",
  "type": "single",
  "content": { "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "题目题干" }] }] },
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": [0],
  "point": 5,
  "explanation": { "type": "doc", "content": [] }
}
```

- `content`（题干）与 `explanation`（解析）都是 tiptap doc JSON；`content` 为字符串仅用于 html 题型
- 成功后响应 `data.cid`（该课程内题目编号），用它填进章节 vue 节点

### 题型与 answer/options 格式（answer 一律数组）

| type | options | answer 示例 | 说明 |
| --- | --- | --- | --- |
| single | 选项字符串数组 | `[0]` | 单选，答案下标 |
| multiple | 选项字符串数组 | `[0, 2]` | 多选，多个下标 |
| judge | `["正确","错误"]` | `[0]` 正确 / `[1]` 错误 | 判断 |
| fill | `["", "", ""]` 或 `["regex"]` | `["答案1","答案2"]` | 填空：**content 里须含 `inputs` 节点**（`attrs.content` 存各空答案），逐空对应 |
| select | 下拉选项数组 | `["选项文本"]` | 下拉：**content 里须含 `select` 节点**（`attrs.content` 存答案文本） |
| sort | 排序项数组（按正确顺序写） | `[0,1,2,3]` | 排序，answer 为正确顺序下标 |
| classify | `[{name, items:[...]}, ...]` | `[0,0,1,1]` | 分类，answer 为每个 item 归属的分类下标（扁平展开） |
| match | `[{left, right}, ...]` | `[0,1,2]` | 连线，answer 为右列正确顺序 |
| puzzle | `{ "url": "<图片地址>", "split": 3 }` | `[0,1,...,8]` | 拼图，answer 为拼块正确位置 |
| html | `[]` | `[1]` | **content 存原始 HTML 字符串**，iframe 内通过 `parent.postMessage({ type: 'correct_rate', rate: 0|1 }, '*')` 判定 |
| short-answer | `[]` | `["^正则$"]` | 简答，answer[0] 为正则表达式 |
| composite | `[]` | `[]` | 大题：**content 存子题数组**（每子题含 type/name/content/options/answer/point），answer 留空 |
| video | `{ "src": "<视频地址>", "questions": [{cid, at}] }` | `[]` | 视频题：看完≥95% 且答对弹题通过；无弹题时看完即过 |
| evaluation | `{ "goal": "...", "threshold": 0.5 }` | `[]` | 评价题：AI 对话评估，progress ≥ threshold 通过 |
| oj | `{ "pid": "" }` | `[]` | OJ 题（对接外部评测，需单独配置） |

### 填空 / 下拉的 content 内嵌节点（易错）

- **fill**：题干里的填空输入框 = `inputs` 节点，答案写在 `attrs.content`：

```json
{ "type": "paragraph", "content": [
  { "type": "text", "text": "行内代码用" },
  { "type": "inputs", "attrs": { "content": "反引号" } },
  { "type": "text", "text": "包裹。" }
] }
```

- **select**：题干里的下拉框 = `select` 节点，答案写在 `attrs.content`（必须是 options 之一）：

```json
{ "type": "paragraph", "content": [
  { "type": "text", "text": "请选择图片语法：" },
  { "type": "select", "attrs": { "content": "![描述](图片地址)" } }
] }
```

> 这两个节点缺失会导致：答题时没有输入框/下拉框，且判分时从 content 提取不到答案。

### 选项里展示 markdown 语法（重要）

选项字符串会被当作 markdown 解析渲染，若选项本身就是 markdown 语法示例
（如 `---`、`**文字**`、`# 标题`、`` `代码` ``、`[文字](地址)`、`- 列表`、`> 引用`），
请用 ```markdown 代码围栏包裹，使其原样展示：

```json
"options": ["```markdown\n---\n```", "```markdown\n**文字**\n```"]
```

- 选项内容含 ``` 时改用 **4 反引号**围栏 ````markdown`，避免被内容中的 ``` 提前闭合
- 只对单选/多选选项需要这样处理；排序/分类/连线/下拉/判断的选项是纯文本插值，无需包裹

## 顺序建议

1. 建题目（收集 cid）→ 2. 组 tiptap JSON（vue 节点引用 cid）→ 3. `POST /api/chapters/update` 保存 content

## 生成后自检（必做，AI 生成 JSON 后逐条校验）

生成章节内容或题目后，**保存前**用脚本递归检查以下规则，任一不满足即视为错误需修正：

| 规则 | 错误示例 | 正确示例 |
| --- | --- | --- |
| ① text 节点 `text` 必须是字符串 | `{"type":"text","text":{"type":"text","text":"内容"}}`（双重嵌套） | `{"type":"text","text":"内容"}` |
| ② heading 必须带 `id` 和 `data-toc-id` | `{"type":"heading","attrs":{"level":2}}`（TOC 不显示） | `{"type":"heading","attrs":{"level":2,"id":"abc...","data-toc-id":"abc..."}}` |
| ③ codeBlock 必须带 `language` | `{"type":"codeBlock","content":[...]}`（按纯文本） | `{"type":"codeBlock","attrs":{"language":"markdown"},...}` |
| ④ text 的 `marks` 必须是数组 | `marks: {marks:[{type:'bold'}]}`（marks is not iterable） | `marks: [{type:'bold'}]` |
| ⑤ fill 题干须含 `inputs` 节点；select 题干须含 `select` 节点 | 题干只有文本（无输入框） | `{"type":"inputs","attrs":{"content":"答案"}}` / `{"type":"select","attrs":{"content":"选项"}}` |
| ⑥ 单选/多选选项含 markdown 语法时用 ```markdown 围栏包裹 | 选项直接写 `---`、`**文字**`（被渲染） | `"```markdown\n**文字**\n```"` |

### 快速校验脚本（递归检查 ①②③④⑤）

可对最终 content JSON 运行，输出违规列表：

```js
function validateContent(node, issues = []) {
  if (!node || typeof node !== 'object') return issues
  if (node.type === 'text') {
    if (typeof node.text !== 'string') issues.push('text.text 非字符串')
    if (node.marks !== undefined && !Array.isArray(node.marks)) issues.push('marks 不是数组')
  }
  if (node.type === 'heading' && !node.attrs?.id) issues.push('heading 缺 id')
  if (node.type === 'codeBlock' && !node.attrs?.language) issues.push('codeBlock 缺 language')
  if (Array.isArray(node.content)) node.content.forEach(n => validateContent(n, issues))
  else if (node.content && typeof node.content === 'object') validateContent(node.content, issues)
  return issues
}
```

> ⑤ 用题目层校验：fill 的 content 里 `JSON.stringify(content).includes('"inputs"')` 必须为 true；select 同理查 `'"select"'`。
