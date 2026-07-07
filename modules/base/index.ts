import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin } from '@nuxt/kit'

/**
 * base module（已合并 auth）
 *
 * 功能：
 * - 基础配置（i18n / hub / ui / nitro / css / runtimeConfig / appConfig）
 * - 基本页面布局（header/main/footer）、form 共用组件、共享 utils（cRequest 等）
 * - 系统设置、WebSocket 连接层、通用 CRUD
 * - 登录/注册/忘记密码、前后端身份认证、个人资料管理
 * - 系统通知、个人网盘、消息收发
 * - schema：roles/permissions/configs/files/users/tokens/userRoles/userClasses/notifys/messages
 *
 * base 必须在 modules 数组中排第一位，确保 i18n / hub / ui 等配置
 * 先于 @nuxthub/core / @nuxt/ui / @nuxtjs/i18n 执行。
 *
 * 脚手架阶段：NUXT_MODULE_BASE=false 时跳过功能注册（基础配置仍生效）。
 */
export default defineNuxtModule({
  meta: { name: 'module-base', configKey: 'moduleBase' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // ========== 基础配置（原 nuxt.config.ts，需在第三方模块 setup 前设置）==========

    const opts = nuxt.options as any

    // i18n
    // top-level 仅定义 locale code/iso/name，不设 langDir/file（root i18n/ 已移除）。
    // 各模块通过 i18n:registerModule 钩子注册各自 locale 文件（deep-merge）。
    opts.i18n = {
      ...(opts.i18n || {}),
      strategy: 'no_prefix',
      locales: [{ code: 'en', iso: 'en-US', name: 'English' }],
      defaultLocale: 'en',
    }

    // @nuxthub/core
    opts.hub = { ...(opts.hub || {}), db: 'postgresql' }

    // @nuxt/ui
    opts.ui = { ...(opts.ui || {}), fonts: false }

    // runtimeConfig 默认值（各模块启用时覆盖为 true）
    opts.runtimeConfig = opts.runtimeConfig || {}
    opts.runtimeConfig.public = {
      moduleBase: false,
      moduleDoc: false,
      moduleLms: false,
      ...(opts.runtimeConfig.public || {}),
    }

    // CSS（原 app/assets/css/main.css）
    nuxt.options.css = [...(nuxt.options.css || []), resolve('./assets/css/main.css')]

    // Nitro
    // 注：scheduledTasks 格式为 { [cron]: taskName }（key=cron，value=taskName），
    // 非 { [taskName]: { cron } }，否则 Nitro 会将对象 stringify 为 [object Object]
    nuxt.options.nitro.scheduledTasks = { '0 0 * * *': 'build-search' }
    nuxt.options.nitro.experimental = {
      ...nuxt.options.nitro.experimental,
      openAPI: true,
      tasks: true,
      websocket: true,
    }
    nuxt.options.nitro.routeRules = {
      ...nuxt.options.nitro.routeRules,
      '/api/**': { cors: true },
    }

    // App config（原 app/app.config.ts）
    nuxt.options.appConfig = nuxt.options.appConfig || {}
    ;(nuxt.options.appConfig as any).ui = {
      ...((nuxt.options.appConfig as any).ui || {}),
      colors: { primary: 'green', neutral: 'slate' },
    }

    // ========== base 模块功能注册（env 控制开关）==========

    const enabled = process.env.NUXT_MODULE_BASE === 'true'
    if (!enabled) return

    // 标记 base 模块已启用，供组件条件渲染使用
    nuxt.options.runtimeConfig.public.moduleBase = true

    // 注册组件目录（pathPrefix: true → 子目录作为前缀，如 auth/loginModal.vue → AuthLoginModal）
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // 注册 composables / utils 自动导入
    // 注：addImportsDir 不会递归扫描子目录，ws/ 子目录需单独注册
    //     useWsConnection / registerWsHandler 供 lms 模块跨模块调用
    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./composables/ws'))
    addImportsDir(resolve('./utils'))

    // lms 未启用时注册 useWebSocket stub（含 race/class/group no-op 方法）
    // lms 启用时由 lms/composables/useWebSocket.ts 提供完整实现，
    // 此处不注册以避免 "Duplicated imports" 警告
    if (process.env.NUXT_MODULE_LMS !== 'true') {
      addImportsDir(resolve('./composables/stubs'))
    }

    // 注册 pages（合并到主 pages）
    nuxt.hook('pages:extend', (pages) => {
      // base 提供简洁首页 index.vue
      // 注：lms 启用时会覆盖首页为课程列表
      pages.push({
        name: 'base-home',
        path: '/',
        file: resolve('./pages/index.vue'),
      })
      // 重置密码页（原 auth module）
      pages.push({
        name: 'auth-reset-password',
        path: '/reset-password',
        file: resolve('./pages/reset-password.vue'),
      })
    })

    // 注册 server 路由 / utils / middleware / plugins / tasks
    addServerScanDir(resolve('./server'))

    // 注册 i18n locale（注：必须调用 registerModule 回调，而非 return config）
    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [{ code: 'en', file: 'en.json' }],
      })
    })

    // 注册客户端 plugin：恢复登录态（原 auth module）
    addPlugin(resolve('./plugins/restore.client.ts'))
  },
})
