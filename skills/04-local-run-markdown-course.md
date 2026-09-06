# Skill: 本地运行 + 创建"Markdown 语法入门"课程（完整演练）

> 目标：本地启动服务器，用 API 建一门介绍 Markdown 语法的课程，
> 具备**分级目录**，且**每个 chapter 内容里嵌入足够的题目（question）**。
> 依赖 skills/01、02、03 的接口说明。

## 一、本地运行

```bash
cd /Users/oldmoon/Documents/ubuntu/nuxt_lms_2026
pnpm install          # postinstall 会自动 nuxt prepare（并生成缺失的 .env / ecosystem.config.cjs）
pnpm dev              # 自动 nuxt-hub db migrate 后启动 dev，默认 http://localhost:3000
```

- 数据库连接走 `.env` 的 `POSTGRES_URL`（本地 PostgreSQL）
- 若用自定义端口/生产模式：`pnpm build && pnpm server`（默认 80）
- 启动后可先访问 `http://localhost:3000` 确认 200

## 二、准备管理员身份

- 用 URL 自动登录：`http://localhost:3000/?username=admin&password=<密码>`
  （或 `POST /api/auth/login` 拿 cookie）
- 后续所有 curl 都带该 cookie，或直接用脚本登录后操作

## 三、执行步骤（建议用脚本/顺序 curl）

### 1. 取课程分类

`GET /api/home` → `data.categories[0].id` 作为 categoryId（没有分类就先建：`POST /api/crud/categories/add` body `{ name }`）。

### 2. 创建课程

`POST /api/courses/add`：

```json
{
  "name": "Markdown 语法入门",
  "code": "MARKDOWN-101",
  "categoryId": <分类id>,
  "tags": ["Markdown", "写作"]
}
```

记录返回的课程 `id`（记为 COURSE_ID）。

### 3. 批量创建章节（含分组章节）

`POST /api/chapters/add`（循环，body 各含 `{ "name", "courseId": COURSE_ID, "isOpen": true }`）。

**分组章节**（父节点，label 不带序号）：基础语法、进阶语法、实践
（各写一段概述内容；是否配题无强制）

**内容章节**（叶子，label 不带序号，序号由前端自动加；每个至少 3~5 道题）：

| 章节 name | 教学主题 | 建议题目（每题 3~5 分） |
| --- | --- | --- |
| 标题与段落 | 一级/二级标题、段落、换行 | 单选×2、判断×2 |
| 强调与列表 | 加粗/斜体/删除线、有序无序列表、任务列表 | 单选×2、多选×2、判断×2 |
| 链接与图片 | 行内链接、引用式链接、图片 | 单选×2、判断×2 |
| 代码 | 行内代码、代码块、语法高亮 | 单选×2、判断×2、填空×2 |
| 表格与引用 | 表格、引用、水平线 | 单选×2、判断×2 |
| 数学公式 | 行内/块级公式（KaTeX） | 单选×2、判断×2 |
| 综合实践一 | 写一篇含标题/列表/链接的文章 | 多选×2、填空×2 |
| 综合实践二 | 用 Markdown 写学习笔记 | 多选×2、判断×2 |
| 综合章节 | 全题型演练（除 OJ 外每题型 1 道） | 单选/判断/多选/填空/下拉/排序/分类/拼图/HTML/简答/连线/复合/视频/评价 各 1 |

记录每个返回的 `id`（chapters）。

### 4. 建题目并嵌入章节内容

对每个章节：

1. 按 skills/03 的表格**建题目**（`POST /api/questions/add`），题目 `content` 用 tiptap JSON 写题干（可含代码块等）；收集每个 `cid`。
2. 组章节 `content`（tiptap doc JSON）：
   - 用 heading/paragraph/bulletList/codeBlock/table 等讲解该主题的 Markdown 语法（参考 skills/03 节点示例）
   - 段落末尾**嵌入刚建的题目**：`{ "type": "vue", "attrs": { "type": "question", "content": "<cid>" } }`
   - 每个章节保证至少 3 道题（单/多选/判断/填空混合）
3. `POST /api/chapters/update`，body `{ "id": <chapterId>, "content": <doc json> }`
   （保存时自动提取 questionIds 到章节）

### 5. 设置分级目录

分组用**章节**实现（父章节 parentId=null，子章节 parentId 指向它），label 不带序号（前端自动加）。

`POST /api/courses/update`，body：

```json
{
  "id": COURSE_ID,
  "orders": [
    { "id": "<基础语法章节id>", "label": "基础语法", "parentId": null, "order": 0 },
    { "id": "<1.1章节id>", "label": "标题与段落", "parentId": "<基础语法章节id>", "order": 0 },
    { "id": "<1.2章节id>", "label": "强调与列表", "parentId": "<基础语法章节id>", "order": 1 },
    { "id": "<1.3章节id>", "label": "链接与图片", "parentId": "<基础语法章节id>", "order": 2 },
    { "id": "<进阶语法章节id>", "label": "进阶语法", "parentId": null, "order": 1 },
    { "id": "<2.1章节id>", "label": "代码", "parentId": "<进阶语法章节id>", "order": 0 },
    { "id": "<2.2章节id>", "label": "表格与引用", "parentId": "<进阶语法章节id>", "order": 1 },
    { "id": "<2.3章节id>", "label": "数学公式", "parentId": "<进阶语法章节id>", "order": 2 },
    { "id": "<实践章节id>", "label": "实践", "parentId": null, "order": 2 },
    { "id": "<3.1章节id>", "label": "综合实践一", "parentId": "<实践章节id>", "order": 0 },
    { "id": "<3.2章节id>", "label": "综合实践二", "parentId": "<实践章节id>", "order": 1 },
    { "id": "<3.3章节id>", "label": "综合章节", "parentId": "<实践章节id>", "order": 2 }
  ]
}
```

即：**3 个分组章节（顶层）+ 9 个章节叶子**（含"综合章节"），形成
"基础语法/进阶语法/实践 → 子章节"的两级树（可再向下扩展为 3 级）。

> 注意：目录中的分组不是 `custom-*` 占位，而是真实章节（含 id，可点击），与现网课程结构一致；`orders` 的 id/parentId 都必须是字符串。

### 6. 综合章节（可选）：覆盖全部题型

想在一页里检验所有题型，可加一个"综合章节"：建好除 OJ 外的 14 种题型各 1 道
（单选/判断/多选/填空/下拉/排序/分类/拼图/HTML/简答/连线/复合/视频/评价，
结构见 skills/03 题型表），全部嵌入该章节 content，再按上面 orders 挂到"实践"下。

### 7. 验证

- 访问 `http://localhost:3000/course/<COURSE_ID>`：左侧目录显示分组+章节层级
- 点击任一章节：正文渲染（标题/代码块/表格/题目 vue 节点）
- 用学生账号进入章节：题目可作答、判分、积分生效

## 四、常见问题

- **403 权限**：确认请求带管理员 cookie
- **外键失败**：categoryId 必须是真实分类 id
- **题目不显示**：章节 content 的 vue 节点 `attrs.content` 必须是题目在该课程下的 `cid`（字符串），且先建题再保存章节
- **章节名与目录不同步**：orders 的 `label` 会在 `courses/update` 时写回 `chapters.name`，以 orders 为准
