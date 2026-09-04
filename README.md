# Nuxt LMS 2026

一个基于 **Nuxt 4 + NuxtHub** 的全栈**在线学习管理系统（LMS）**，并内嵌一个 **Phaser 2D MMO 教育小游戏**。涵盖用户/角色权限、课程-章节-班级教学体系、多题型互动、成绩排行与经验金币奖励，以及配套管理后台。

技术栈：`Nuxt 4` · `NuxtHub`（`PostgreSQL` + `Drizzle ORM`）· `@nuxt/ui` · `@nuxtjs/i18n` · `Tiptap / @umoteam/editor` 富文本 · `Colyseus` 实时服务器 · `Phaser 3` · `Tailwind CSS` · `Vitest`。

## 功能特性

### LMS 学习系统

- **用户体系与权限**：登录/注册/忘记密码、`users / roles / permissions` 角色权限，支持学生/教师/管理员。

- **教学组织**：`courses` 课程 → `chapters` 章节 → `classes` 班级，通过 `class_courses / class_chapters` 关联班级开放；用户主班级由 `users.defaultClass`（JSON）或 `users.classId` 决定。

- **互动题型**：`questions`（单选/多选/判断/HTML/拼图等）、`homeworks` 作业、`quizzes` 测验、`races` 竞赛抢答、`peer_reviews` 互评。

- **成绩与激励**：`userChapters / userCourses` 记录得分与进度；经验/金币升级、`medals` 奖章、课程总分与排行榜。

- **互动社交**：评论（`comments`，富文本，支持审核/班级隔离）、弹幕 `danmaku`、互动投票/点名。

- **富文本编辑器（ueditor）**：基于 `@umoteam/editor` + Tiptap，支持 Markdown、HTML 渲染、KaTeX 公式、嵌入式互动节点（题目/作业/测验/评论/聊天室等）。

- **AI 辅助**：`aichat` 组件、LLM 生成题目（集成 system config 里的 llms 参数）。

- **系统配置**：`configs` 拍平键值配置，站点统计/分析脚本、LMS 章节配置等。

### 管理后台（Admin）

- `/dashboard` 仪表盘统计可视化 + 左侧菜单按数据库表自动生成、可编辑标签/排序/隐藏。

- 通用 CRUD（`/api/crud/[table]`）：分页/排序/隐藏列、多条件筛选、软删除与回收站、导入导出。

- 列类型智能渲染（图片预览、外键下拉、日期本地化）与个性化新增/编辑表单。

### MMO 教育游戏

- `/mmo` 等多页（禁用 SSR）：瓦片地图、角色创建器、多人实时联机。

- `Colyseus` 实时游戏服务器（`GameRoom`） + `game_info` 玩家存档（位置/金币/经验/升级/任务/背包）。

- 附件：角色创建、背包、任务进度、经验升级、金币商城、瓦片编辑器。

### 基础能力（Base）

- 认证、统一响应包装 `cResp`、通用 CRUD、WebSocket 连接层、系统通知/消息/个人网盘、站点配置单例。

## 项目结构

```
app/                    # 应用壳（app.vue、StartupGate）
modules/
  base/                 # 基础能力：认证、cResponse、通用CRUD、WS、通知
  lms/                  # 学习系统：课程/章节/班级、题型、成绩互动、ueditor
  admin/                # 后台 dashboard（/dashboard）
  mmo/                  # MMO 游戏（Phaser + Colyseus，/mmo）
server/db/              # 顶层 Schema 汇总 + Drizzle 迁移
game_assets/            # 游戏素材
public/ storage/        # 静态资源与上传
scripts/                # 脚本
test/                   # 共享测试工具（setup/、e2e/、unit/）
```

每个模块自包含：`components` / `composables` / `pages` / `server`（`api/`、`db/schema.ts`）/ `i18n/locales`，通过 NuxtKit 的 `addComponentsDir / addServerScanDir / pages:extend` 注册；`server/api` 同路径用 Nitro `scanDirs` 顺序实现 lms 覆盖 base。

## 快速开始

### 1. 环境变量

```bash
cp .env.example .env   # 按需修改
```

关键变量：

| 变量                                   | 说明                               |
| ------------------------------------ | -------------------------------- |
| `POSTGRES_URL`                       | PostgreSQL 连接串                   |
| `MAIL_*`                             | 邮件 SMTP（QQ 邮箱示例）                 |
| `SITE_URL`                           | 站点地址                             |
| `AI_API_KEY / AI_API_URL / AI_MODEL` | AI Chat / 生成题目配置                 |
| `NUXT_MODULE_BASE/LMS/ADMIN/MMO`     | 各模块开关（`true` 启用）                 |
| `MMO_WS_PORT`                        | Colyseus WebSocket 端口（默认 `2567`） |

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm dev   # 自动执行 nuxt-hub db migrate，再启动 nuxt dev，默认 http://localhost:3000
```

## 数据库迁移

```bash
pnpm dev                        # 启动时自动应用已有迁移
npx nuxt-hub db migrate         # 应用迁移
npx nuxt-hub db generate        # 由 schema 生成新迁移（schema 变更后）
```

Schema 分布在 `modules/{base,lms,admin,mmo}/server/db/schema.ts`，由 `hub:db:schema:extend` 聚合。

## 测试

Vitest 按 4 个 project 组织（见 `vitest.config.ts`）：

```bash
pnpm test          # 全部测试
pnpm test:unit     # 仅 unit（Node 环境）
pnpm test:watch    # watch 模式
```

- `unit`：API 端点（Node）

- `composables`：composable（happy-dom + stub）

- `components`：Vue 组件（happy-dom + @vue/test-utils）

- `e2e`：Nuxt 端到端（@nuxt/test-utils）

共享桩：`test/setup/nuxt-stubs.ts`（requireAuth/requireRole、cRequest/i18n 等）、`test/setup/db-helpers.ts`（mock db）。

## 构建与部署

```bash
pnpm build        # 生产构建（NODE_OPTIONS 调大内存）
pnpm preview      # 本地预览生产构建
```

正式部署（PM2，`ecosystem.config.example.cjs` 参考）：

```bash
cp ecosystem.config.example.cjs ecosystem.config.cjs
pnpm build
pnpm server       # node .output/server/index.mjs（默认端口 80）
pnpm pm           # 或 pm2 restart ecosystem.config.cjs
```

Nitro 开启 `openAPI / tasks / websocket` 实验特性，`compressPublicAssets` 启用 gzip/brotli。

## 常用脚本

| 命令                             | 说明               |
| ------------------------------ | ---------------- |
| `pnpm dev`                     | 开发（含 db migrate） |
| `pnpm build` / `pnpm preview`  | 生产构建 / 预览        |
| `pnpm server`                  | 直接运行生产 Server    |
| `pnpm pm`                      | PM2 重启           |
| `pnpm test` / `pnpm test:unit` | 测试               |

<br />
