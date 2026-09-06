# Skill: 创建互动组件实体（homework / quiz / race / comment）并嵌入章节

> 用途：课程里除了 question（见 skills/03），还有作业/测验/抢答/评论四类互动实体。
> 本文记录它们的**创建 API** 与**章节嵌入方式**。所有实体都挂在课程下
> （复合主键 courseId + cid），add 接口传 `course_id` + 字段，响应 `data` 里取 `cid`。
>
> 嵌入方式统一为 vue 节点：`{ "type": "vue", "attrs": { "type": "<类型>", "content": "<cid字符串>" } }`
> （保存章节时自动把 id 提取到 chapters 对应字段）。

## 1. homework 作业

`POST /api/homeworks/add`（教师/管理员）

```json
{
  "course_id": 10,
  "name": "作业：Markdown 练习",
  "content": { "type": "doc", "content": [ ...作业要求，tiptap doc JSON... ] },
  "explanation": { "type": "doc", "content": [] },
  "point": 10,
  "tags": []
}
```

| 字段 | 说明 |
| --- | --- |
| `name` | 作业标题 |
| `content` | 作业要求正文（tiptap doc JSON；也可 markdown 字符串，服务端不转，**建议直接传 doc JSON**） |
| `point` | 分值，默认 10 |
| `explanation` | 解析/参考答案（可选） |

嵌入：`{ "type": "vue", "attrs": { "type": "homework", "content": "<cid>" } }`
（学生端在 homework 节点里提交富文本作答，教师批阅走 `/api/homeworks/grade`）

## 2. quiz 测验

`POST /api/quizzes/add`（教师/管理员）

```json
{
  "course_id": 10,
  "name": "测验：Markdown 基础",
  "content": { "type": "doc", "content": [] },
  "questions": [21, 1, 3],
  "timeLimit": 600,
  "submitLimit": 1,
  "point": 100
}
```

| 字段 | 说明 |
| --- | --- |
| `questions` | **题目 cid 的数字数组**（如 `[21, 1, 3]`）或 `{id, point}` 对象数组。⚠️ **必须传数字**——渲染层用 `typeof item === 'number'`（或 `Number(item.id)`）规范化，传字符串 `"21"` 会被全部过滤掉，quiz 渲染成没有任何题目的空壳 |
| `timeLimit` | 限时秒数，默认 600 |
| `submitLimit` | 允许提交次数，默认 1 |
| `point` | 总分，默认 100 |

嵌入：`{ "type": "vue", "attrs": { "type": "quiz", "content": "<cid>" } }`

## 3. race 抢答

`POST /api/races/add`（教师/管理员）

```json
{
  "course_id": 10,
  "name": "抢答：语法抢答赛",
  "content": { "type": "doc", "content": [] },
  "questionIds": [21, 1],
  "gapTime": 10,
  "point": 5
}
```

| 字段 | 说明 |
| --- | --- |
| `questionIds` | **题目 cid 的数字数组**（如 `[21, 1]`）或 `{id}` 对象数组。⚠️ 同 quiz：**必须传数字**——渲染层 `typeof item === 'number' ? item : Number(item.id)` 规范化，字符串项会变 NaN 被过滤，race 渲染成空壳 |
| `gapTime` | 两题间隔秒数，默认 10 |
| `point` | 每题分值 |

嵌入：`{ "type": "vue", "attrs": { "type": "race", "content": "<cid>" } }`

## 4. comment 评论区

评论是**用户产生的内容**（`requireAuth`，记录 userId），与前三类不同：

- 教师/管理员也可登录后调用 `POST /api/comments/add` 创建"主题评论"：

```json
{
  "course_id": 10,
  "name": "讨论：表格与引用排版",
  "content": { "type": "doc", "content": [ { "type": "paragraph", "content": [{ "type": "text", "text": "讨论主题" }] } ] }
}
```

- **必须带 `name`**（评论区标题，渲染在组件头部，不传则标题空白）
- `content` 不能为空（服务端校验），且做富文本安全校验（禁止 iframe/script 等）
- **status 规则**：顶层评论（无 `parentId`）创建即 `published`（对学生立即可见）；回复（有 `parentId`）默认 `audit` 待审，教师过审后才可见（`POST /api/comments/approve`）
- 嵌入：`{ "type": "vue", "attrs": { "type": "comment", "content": "<cid>" } }`，
  学生在该节点内发回复（编辑器里新建 comment 节点时也是先建评论实体拿 cid 再回填 attrs.content）

## 5. 顺序建议

1. 建题目（skills/03，收集 cid）→ 2. 建 homework/quiz/race（quiz/race 引用题 cid）→
3. 组章节 content（vue 节点引用各实体 cid）→ 4. `POST /api/chapters/update` 保存

## 6. 查看与验证

- `GET /api/homeworks/show?course_id=<id>&cid=<cid>`（quiz/race/comment 同构：`/api/quizzes/show`、`/api/races/show`、`/api/comments/show`）
- 删除单个实体：`POST /api/courses/delete`，body `{ "course_id", "cid", "type": "homework|quiz|race|comment|question" }`（见 skills/05）
- 章节渲染后各 vue 节点应显示对应互动组件；403 检查登录身份（教师/管理员）
- **保存后必须回读自检**（防"空壳组件"）：
  - `GET /api/quizzes/show?course_id=&cid=` 回读 `questions` 必须是**非空数字数组**
  - `GET /api/races/show` 回读 `questionIds` 同上
  - `GET /api/comments/show` 回读 `name` 非空、`content` 非空
  - quiz/race/comment 渲染层对引用字段有类型过滤，**字符串 cid 会静默变成空壳组件**（页面不报错但没内容），只看 add 接口返回 200 发现不了
- chapters/update 的 id 提取映射只含 question/homework/comment/quiz（**无 race**，chapters 表也没有 race_ids 列）；race 的 vue 节点靠 attrs.content 的 cid 直接渲染，不受影响
