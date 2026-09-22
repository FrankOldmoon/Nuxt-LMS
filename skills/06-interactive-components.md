# Skill: Create interactive component entities (homework / quiz / race / comment) and embed them

> Purpose: besides question (see skills/03), a course has four more interactive entity types:
> homework / quiz / race / comment. This doc records their **creation APIs** and **embedding syntax**.
> All entities belong to a course (composite key courseId + cid); the add endpoints take `course_id` + fields,
> and the response `data` contains the `cid`.
>
> Embedding is uniform: vue node `{ "type": "vue", "attrs": { "type": "<type>", "content": "<cid string>" } }`
> (on save the id is extracted into the matching chapters field automatically).

## 1. homework

`POST /api/homeworks/add` (teacher/admin)

```json
{
  "course_id": 10,
  "name": "Homework: Markdown practice",
  "content": { "type": "doc", "content": [ ...requirements, tiptap doc JSON... ] },
  "explanation": { "type": "doc", "content": [] },
  "point": 10,
  "tags": []
}
```

| Field | Description |
| --- | --- |
| `name` | homework title |
| `content` | requirements body (tiptap doc JSON; a markdown string is **not** converted by the server — **pass doc JSON directly**) |
| `point` | points, default 10 |
| `explanation` | explanation / reference answer (optional) |

Embed: `{ "type": "vue", "attrs": { "type": "homework", "content": "<cid>" } }`
(students submit rich-text answers inside the homework node; teachers grade via `/api/homeworks/grade`)

## 2. quiz

`POST /api/quizzes/add` (teacher/admin)

```json
{
  "course_id": 10,
  "name": "Quiz: Markdown basics",
  "content": { "type": "doc", "content": [] },
  "questions": [21, 1, 3],
  "timeLimit": 600,
  "submitLimit": 1,
  "point": 100
}
```

| Field | Description |
| --- | --- |
| `questions` | **number array of question cids** (e.g. `[21, 1, 3]`) or `{id, point}` objects. ⚠️ **Numbers are mandatory** — the renderer normalizes with `typeof item === 'number'` (or `Number(item.id)`); string items like `"21"` are all filtered out and the quiz renders as an empty shell |
| `timeLimit` | time limit in seconds, default 600 |
| `submitLimit` | allowed submissions, default 1 |
| `point` | total points, default 100 |

Embed: `{ "type": "vue", "attrs": { "type": "quiz", "content": "<cid>" } }`

## 3. race (quick-answer)

`POST /api/races/add` (teacher/admin)

```json
{
  "course_id": 10,
  "name": "Race: syntax quick-answer",
  "content": { "type": "doc", "content": [] },
  "questionIds": [21, 1],
  "gapTime": 10,
  "point": 5
}
```

| Field | Description |
| --- | --- |
| `questionIds` | **number array of question cids** (e.g. `[21, 1]`) or `{id}` objects. ⚠️ Same as quiz: **numbers are mandatory** — the renderer normalizes with `typeof item === 'number' ? item : Number(item.id)`; string items become NaN, get filtered, and the race renders as an empty shell |
| `gapTime` | seconds between questions, default 10 |
| `point` | points per question |

Embed: `{ "type": "vue", "attrs": { "type": "race", "content": "<cid>" } }`

## 4. comment (discussion)

Comments are **user-generated content** (`requireAuth`, records userId), unlike the other three:

- Teachers/admins can also create a "topic comment" while logged in via `POST /api/comments/add`:

```json
{
  "course_id": 10,
  "name": "Discussion: table and quote layout",
  "content": { "type": "doc", "content": [ { "type": "paragraph", "content": [{ "type": "text", "text": "Discussion topic" }] } ] }
}
```

- **`name` is required** (rendered in the component header; the title is blank without it)
- `content` must not be empty (server-validated) and goes through rich-text sanitisation (iframe/script etc. forbidden)
- **status rules**: top-level comments (no `parentId`) are `published` immediately (visible to students); replies (with `parentId`) default to `audit` and become visible only after teacher approval (`POST /api/comments/approve`)
- Embed: `{ "type": "vue", "attrs": { "type": "comment", "content": "<cid>" } }`;
  students reply inside the node (when creating a comment node in the editor, the entity is created first and its cid written back to attrs.content)

## 5. Body content: minimum quality bar (homework / comment)

`content` is what the student reads before doing the task — **one short sentence is not enough**. Rules:

- **Always pass tiptap doc JSON, never a bare string.** `/api/homeworks/update` and `/api/comments/update`
  write the value straight through (no `normalizeContent`), so a string stays a string and other clients
  render it inconsistently. ⚠️ The **chapters / courses** endpoints *do* convert markdown → doc; these two
  do **not**. (History: chapter 161's homework/comment were one-sentence strings until 2026-09-22.)
- **At least 2 sentences, laid out as 2 paragraphs**:
  1. 第 1 段 = **做什么**：学生要操作什么、看什么；关键词可用 `bold` 标出；
  2. 第 2 段 = **交什么 / 检查点**：怎么提交，以及验收要求（用 `✅` 开头）。
- 每段用语义 emoji 开头（📷 / 📸 截图提交、💡 讨论、🤔 追问）。
- **comment 也要 ≥2 句**：先让学生用自己的话复述概念，再让他举一个真实例子或提问。
- `name` 同样是学生可见文本，别留拼写错误（历史坑：`Feature and edge dectection`）。

Example（homework，course 5 / chapter 161 cid=8）:

```json
{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [
      { "type": "text", "text": "📷 Open both AI vision demos above and try them with a picture: the first one pulls " },
      { "type": "text", "text": "features", "marks": [{ "type": "bold" }] },
      { "type": "text", "text": " out of it, the second one finds the " },
      { "type": "text", "text": "edges", "marks": [{ "type": "bold" }] },
      { "type": "text", "text": " of the objects." }
    ] },
    { "type": "paragraph", "content": [
      { "type": "text", "text": "📸 Take a screenshot of the result and submit it here. ✅ Make sure the screenshot clearly shows what the demo detected." }
    ] }
  ]
}
```

**Update an existing entity**（`add` 之外的入口，只改你要改的字段）：

```json
POST /api/homeworks/update   { "course_id": 5, "id": 8,  "content": <doc> }
POST /api/comments/update    { "course_id": 5, "id": 125, "content": <doc> }
```

- `homeworks/update`：`{course_id, id}` + 任意字段（`id` 即 cid，`cid` 会被删除，不允许改）
- `comments/update`：字段白名单只有 `name / code / content / tags / point`，且 content 会过
  `validateCommentContent`（禁 iframe/script）且不能为空

## 6. Suggested order

1. Create questions (skills/03, collect cids) → 2. Create homework/quiz/race (quiz/race reference question cids) →
3. Assemble chapter content (vue nodes referencing entity cids) → 4. Save via `POST /api/chapters/update`

## 7. Inspect and verify

- `GET /api/homeworks/show?course_id=<id>&cid=<cid>` (quiz/race/comment are isomorphic: `/api/quizzes/show`, `/api/races/show`, `/api/comments/show`)
- Delete a single entity: `POST /api/courses/delete`, body `{ "course_id", "cid", "type": "homework|quiz|race|comment|question" }` (see skills/05)
- After saving, each vue node should render the matching interactive component; a 403 means check the login identity (teacher/admin)
- **Read back after saving (prevents "empty-shell components")**:
  - `GET /api/quizzes/show?course_id=&cid=` — `questions` must be a **non-empty number array**
  - `GET /api/races/show` — same for `questionIds`
  - `GET /api/comments/show` — `name` and `content` must be non-empty
  - `GET /api/homeworks/show` / `GET /api/comments/show` — `content` must be an **object** (tiptap doc)
    with **≥2 paragraphs**, not a one-line string
  - The quiz/race/comment renderers type-filter their reference fields; **string cids silently become empty-shell components**
    (the page shows no error but has no content), and a 200 from add alone does not reveal it
- The id-extraction map of chapters/update only contains question/homework/comment/quiz (**no race**; the chapters table
  has no race_ids column); the race vue node renders directly from the cid in attrs.content and is unaffected
