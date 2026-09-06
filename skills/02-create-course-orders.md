# Skill: 批量给某个课程创建目录（分级章节树）

> 用途：给一门课程建立"分级目录"（章节/子章节）。本系统目录结构存储在
> `courses.orders`（JSON 数组）；**目录里的"分组"也是真实章节**（同一张 chapters 表），
> 层级通过 `parentId` 指向父章节 id 形成（与现网课程一致：分组章节可含概述内容）。
>
> 参照：`GET /api/courses/show?id=<id>` 返回的 `orders`（如现有课程的 orders 形态）。

## 目录结构约定（重要）

- **每个目录项都对应一个章节**（`id` 为章节 id 的字符串）；分组标题 = 一个章节，它的 `parentId=null`，子章节 `parentId` 指向它
- `label` 是显示名，**不要带序号**（如写"标题与段落"而不是"1.1 标题与段落"）——侧边栏会自动加 `1 / 1.1 / 1.1.1` 序号
- 层级最多 3 级：顶层章节 → 子章节 → 孙章节（都通过 parentId 嵌套）
- （前端扩展项，非标准用法：`id='course'` 表示课程首页链接、`id='custom-xxx'` 生成 `#锚点` 占位，标准目录请全部用章节 id）

## 分两步

### 步骤 1：批量创建章节（chapters）

`POST /api/chapters/add`（管理员或课程任课教师）

```json
{
  "name": "章节标题",
  "courseId": 1,
  "isOpen": true
}
```

- `name` 必填；`courseId` 必填；`isOpen` 不传时默认取课程 `lmsConfig.course.defaultChapterOpen`
- 成功响应 `data` 为数组，取 `data[0].id` 作为章节 id
- **分组章节**与普通章节一样创建（名字即分组名，如"基础语法"），后续作为父节点
- 批量 = 循环调用，收集每个 `id`

### 步骤 2：设置课程目录（orders）

`POST /api/courses/update`，body：

```json
{
  "id": 1,
  "orders": [
    { "id": "74", "label": "基础语法", "parentId": null, "order": 0 },
    { "id": "66", "label": "标题与段落", "parentId": "74", "order": 0 },
    { "id": "67", "label": "强调与列表", "parentId": "74", "order": 1 },
    { "id": "68", "label": "链接与图片", "parentId": "74", "order": 2 },
    { "id": "75", "label": "进阶语法", "parentId": null, "order": 1 },
    { "id": "69", "label": "代码", "parentId": "75", "order": 0 },
    { "id": "70", "label": "表格与引用", "parentId": "75", "order": 1 },
    { "id": "71", "label": "数学公式", "parentId": "75", "order": 2 },
    { "id": "76", "label": "实践", "parentId": null, "order": 2 },
    { "id": "72", "label": "综合实践一", "parentId": "76", "order": 0 },
    { "id": "73", "label": "综合实践二", "parentId": "76", "order": 1 }
  ]
}
```

### orders 元素字段说明

| 字段 | 说明 |
| --- | --- |
| `id` | 章节 id 的**字符串**形式（如 `"74"`） |
| `label` | 显示标题（不带序号）。更新课程时同步写回 `chapters.name` |
| `parentId` | 父章节的 `id`；顶层项填 `null` |
| `order` | 同级排序（数字，从小到大） |

### 层级规则（与前端 useNavigation / useCourseDetailPage 一致）

- `parentId === null` 的项是顶层章节
- `parentId === 某个章节 id` 的项是它的子章节，递归最多 3 级（含顶层）
- 渲染顺序：顶层按 order 排，子级按 order 排；序号 `1 / 1.1 / 1.1.1` 由前端自动生成

## 注意

- 权限：`requireCourseTeacher`（管理员或该课程任课教师）
- 先建章节拿到 id，再写 orders；`orders` 里不要出现不存在的章节 id
- 分组章节（父节点）建议也写内容（概述），是否配题无强制（参照现网父章节）
- 更新 orders 会广播 `home-changed` 刷新首页导航；章节 name 同步逻辑见 `courses/update.post.ts`
- 章节实际学习页面路径：`/course/<courseId>/<chapterId>`
