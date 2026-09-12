import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin, addLayout } from '@nuxt/kit'

/**
 * admin module — 后台 dashboard 表管理
 *
 * 功能：
 * - /dashboard 仪表盘：统计可视化（复用 base 的 <Chart>）
 * - 左侧菜单：UNavigationMenu 按数据库每张表生成按钮，可编辑标签 / 排序 / 隐藏，
 *   存入 configs 表（key=admin:menu）。小屏时变为左侧浮动抽屉。
 * - 右侧表管理：结合 base 的 /api/crud/[table] 实现 CRUD；列依据 API 返回的列定义动态展示；
 *   分页 / 排序 / 隐藏列；顶部多条件筛选；垃圾桶（软删除恢复与彻底删除，支持批量）；
 *   导入导出（复用 base 的 <Sheet>）。
 * - cellView：按列类型自定义渲染（图片预览、日期本地化等），cshow 复用以预览行详情。
 * - cform：按列类型个性化新增 / 编辑表单（日期选择器、外键 select 等）。
 *
 * 依赖：base（cRequest、auth、通用 CRUD、<Chart>、<Sheet>）
 *
 * 开关：NUXT_MODULE_ADMIN=true 时注册功能。
 */
export default defineNuxtModule({
  meta: { name: 'module-admin', configKey: 'moduleAdmin' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // 标记 admin 模块启用状态，供组件条件渲染使用
    const enabled = process.env.NUXT_MODULE_ADMIN === 'true'
    nuxt.options.runtimeConfig.public.moduleAdmin = enabled
    if (!enabled) return

    // 注册组件目录（pathPrefix: true → 子目录作为前缀，如 table/Manager.vue → <TableManager>）
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // 注册 admin 布局：独立外壳（自己的顶栏 + 左菜单 + 内容），不含 base 的 header/footer
    addLayout(resolve('./layouts/admin.vue'), 'admin')

    // 注册 composables / utils 自动导入
    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./utils'))

    // 注册 server 路由 / utils
    addServerScanDir(resolve('./server'))

    // 注册页面（合并到主 pages）—— 嵌套路由：父壳 dashboard.vue + 子页，使左侧菜单在所有 /dashboard/* 共享
    nuxt.hook('pages:extend', (pages) => {
      pages.push({
        name: 'admin-dashboard',
        path: '/dashboard',
        file: resolve('./pages/dashboard.vue'),
        children: [
          { name: 'admin-dashboard-home', path: '', file: resolve('./pages/dashboard/index.vue') },
          { name: 'admin-table', path: 't/:table', file: resolve('./pages/dashboard/t/[table].vue') },
        ],
      })
    })

    // 注册 i18n locale
    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'cn', file: 'cn.json' },
        ],
      })
    })

    // 客户端插件：管理后台访问守卫
    addPlugin(resolve('./plugins/admin-guard.client.ts'))

    // 表个性化覆盖插件：仅当 lms 启用时注册（覆盖组件 import LMS 组件，lms 关闭时不编译）
    if (process.env.NUXT_MODULE_LMS === 'true') {
      addPlugin(resolve('./plugins/overrides.ts'))
    }
  },
})
