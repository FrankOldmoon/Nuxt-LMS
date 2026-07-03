# 开发架构

## 全栈

- Nuxt 4（Module 模式）
- 所有vue和utils里的函数都是全局自动引入，不需要手写
- 读取package.json, 理解项目依赖
- 前端读取./app/utils/和./app/composables里的文件，前端全局函数都调用于这里和写入到这里，api访问都用cRequest
- 前端读取./app/components/文件夹，前端组件多原子化拆解，多复用，多用cdn加载，少写复杂组件
- 后端读取./server/utils和./server/db/schema.ts，后端全局函数都调用于这里和写入到这里

## 前端

- @nuxt/ui v4.9.0 Nuxt 官方 UI 组件库，关闭内置字体自动引入，基于 TailwindCSS
- TailwindCSS v4.3.2：原子化 CSS 样式框架
- Less：预处理器（dev 依赖）
- Icon：lucide 图标集（Iconify）
- 拖拽：vuedraggable
- @umoteam/editor：基于tiptap v3的富文本编辑器，./app/components/ueditor文件夹下是我自己写的tiptap拓展和渲染方法
- @nuxtjs/i18n 10.4.0：国际化

## 数据库

- ORM：Drizzle ORM 0.45.2
- drizzle-kit：数据库迁移、schema 生成工具，命令 npx nuxt db generate
- PostgreSQL 双驱动
- postgres：标准 Node 端 Postgres 驱动

## 内容

- 这是LMS系统，前端主要展示课程和章节信息，以及教师与学生操作
- 前端全局有的course_id,chapter_id,user.default_class,user，可以随时在前端获取
- 后端处理相应操作，返回和更新数据