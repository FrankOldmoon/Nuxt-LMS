# Skill: 批量创建课程

> 用途：通过 API 一次创建多门课程（本系统没有"批量创建"端点，batch.post 只做删除/恢复，因此批量 = 循环调用 add）。

## 前置：登录（管理员）

后端 API 多数需要管理员身份。两种登录方式任选：

1. URL 参数自动登录（base 插件支持，登录后自动清除参数）：
   `http://localhost:3000/?username=admin&password=<密码>`
2. 显式登录拿 cookie：
   `POST /api/auth/login`，body `{ username, password }`，后续请求带返回的 cookie。

> 管理员账号密码以项目实际 `.env` / 数据库 users 表为准。若不知密码，可直接在数据库重置（密码为 `salt:derivedKey` 的 scrypt 哈希，见 `modules/base/server/utils/auth/password.ts`）。

## 获取课程分类（categoryId 必填）

课程必须有 `categoryId`（外键到 categories）。查询可用分类：

- `GET /api/home`（首页数据，返回 `data.categories` 数组，含 `id`/`title`）
- 或通用 CRUD：`GET /api/crud/categories/list`（仅管理员，支持分页参数）

## 创建单门课程

`POST /api/courses/add`（仅管理员）

```json
{
  "name": "课程标题",
  "code": "COURSE-CODE",
  "categoryId": 1,
  "tags": ["标签1", "标签2"],
  "config": {},
  "content": {
    "type": "doc",
    "content": []
  }
}
```

- `name` 必填；`categoryId` 必填（数字）
- 可选：`code`、`tags`（数组）、`config`（JSON，可含 `lmsConfig` 课程级配置）
- `orders`（章节目录）不在此步骤设置（见 skills/02）
- 成功响应 `data` 为数组，含新记录一行，取 `data[0].id` 作为课程 id

## ⚠️ 课程首页 content（必写，与 chapter 相同 JSON 结构）

课程必须有 `content`（课程首页/简介，渲染在 `/course/<id>` 顶部"关于课程"区，
由 `UeditorRender` 渲染，结构**与 chapter 的 content 完全一致**：根节点
`{ "type": "doc", "content": [块级节点...] }`）。创建时直接随 body 带上，或创建后
`POST /api/courses/update` 更新（同样自动存旧版本快照）。

- 结构、节点、富组件（`:::` 转 tiptap）、题目嵌入等规则 **与 chapter content 完全一致**，见 skills/03
- **多写 emoji**：课程简介的标题、段落、列表要多用 emoji（规范见 skills/03「多写 emoji」），如 `## 📚 课程介绍`、`- ✅ 适合零基础`
- **无需本机转 JSON**：add/update 接口的 `content` 可以直接传 **markdown 字符串**，
  服务端自动 `markdownToTiptap` 转 doc 并补 heading id（见 skills/03「保存入口直接支持 markdown」）
- 推荐做法：直接把课程简介的 markdown 文本作为 `content` 传入即可
- 不写 content → 课程首页"关于课程"区不显示（`hasContent` 为假），视为漏写

## 批量创建

```text
循环调用 POST /api/courses/add 即可。建议顺序执行并收集每个返回的 id，
供后续"给课程创建目录"使用。每创建一个课程会广播 home-changed 刷新首页导航。
```

## 重要：创建后可能不显示在 header 菜单

顶部导航（useHeaderNav）通过 **分类的 `orders`** 决定显示哪些课程：
- 若分类**没有** orders 配置 → 该分类下所有课程都显示
- 若分类**有** orders 配置（如本项目的 Test 分类）→ 只显示 orders 中 `id` 对应的课程

所以创建课程后若 header 看不到，需把新课程加入分类 orders：
`POST /api/categories/update`，body：

```json
{
  "id": 1,
  "orders": [
    { "id": "1", "label": "tt", "order": 0, "parentId": null },
    { "id": "3", "label": "Markdown 语法入门", "order": 1, "parentId": null },
    { "id": "4", "label": "新课程标题", "order": 2, "parentId": null }
  ]
}
```

> `orders` 的 `id` 是课程 id 的字符串；`label` 会同步写回 `courses.title`。
> 更新后广播 home-changed，header 菜单自动刷新（无需重启）。

## 注意

- 权限：`requireAdmin`，非管理员返回 403
- 创建后首页课程卡片立即可见（无需手动刷新，WS 自动同步）
- 校验：`name` 缺失会失败；`categoryId` 指向不存在的分类会因外键失败
