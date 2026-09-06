# Skill: 删除/恢复课程与章节

> 用途：删除某门课程、某个章节，或恢复被删除的课程/章节。
> 本系统**没有单独"删除单个"的精细 endpoint**，课程/章节都走通用批量接口
> `POST /api/batch`（软删 / 硬删 / 恢复）；`courses/delete.post.ts` 只能删课程内
> 的题目/作业/评论/测验/抢答，不能删课程本身。

## 前置：登录（管理员）

删除/恢复课程与章节都要求管理员身份（`requireAdmin`），非管理员返回 403。
登录方式与 skills/01 相同：
`POST /api/auth/login` body `{ username, password }`，后续请求带返回的 cookie。

## 三种动作（action）

| action | 含义 | 说明 |
| --- | --- | --- |
| `delete` | 软删除 | 设置 `deleted_at`，记录保留，可从回收站恢复 |
| `remove` | 硬删除 | 从数据库物理删除，**不可恢复** |
| `restore` | 恢复 | 清空 `deleted_at`，软删的记录恢复可见 |

> 建议日常"删除"用软删（`delete`），除非确认要彻底清理才用 `remove`。

## 删除课程

`POST /api/courses/batch`（仅管理员），body：

```json
{
  "ids": [4, 5],
  "action": "delete"
}
```

- `ids`：课程 id 数组（数字）
- `action`：`delete` / `remove` / `restore`
- 删除/恢复课程会广播 `home-changed` 刷新首页导航

## 删除章节

`POST /api/chapters/batch`（仅管理员），body：

```json
{
  "ids": [78, 79],
  "action": "delete"
}
```

- `ids`：章节 id 数组（数字）
- `action`：`delete` / `remove` / `restore`
- 注意：删章节**不会**自动从课程 `courses.orders` 移除对应目录项，需另行更新 orders

## 删除课程内的题目/作业等（courses/delete）

`POST /api/courses/delete`（教师/管理员），按类型 + 课程内 cid 删除**单个内容实体**：

```json
{
  "course_id": 4,
  "cid": 27,
  "type": "question"
}
```

- 仅用于删除课程内的题目/作业/评论/测验/抢答，`type` 可选：
  `question` / `homework` / `comment` / `quiz` / `race`
- 不是用来删课程或章节的

## 注意事项

- **目录不同步**：删除章节后，该章节若仍在课程 `orders` 中，会用 `label` 关联一个不存在的 id，前端无法导航。建议删除章节后同步更新 `courses.orders`（见 skills/02）
- **软删 vs 硬删**：`remove` 会级联物理删除，永久丢失数据，谨慎使用
- **题目被引用**：删除课程内题目后，章节 content 里对应的 vue 节点会显示"题目未找到"，需同步清理章节内容