import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin, addLayout, resolvePath } from '@nuxt/kit'
import fs from 'fs'

/**
 * base module（base 模块的重构版，自包含、不感知 doc/lms）
 *
 * 功能：
 * - 基础配置（i18n / hub / ui / nitro / css / runtimeConfig / appConfig）
 * - 基本页面布局（header/main/footer）、form 共用组件、共享 utils（cRequest 等）
 * - 系统设置（拍平 key 存储）、WebSocket 连接层、通用 CRUD
 * - 登录/注册/忘记密码、前后端身份认证、个人资料管理
 * - 系统通知、个人网盘、消息收发
 * - schema：roles/permissions/configs/files/users/tokens/userRoles/notifys/messages
 *
 * 扩展点（供后续模块引用，base 自身不感知后续模块）：
 * - server hooks：runOnMeEnrich / runOnUserImported
 * - ws handler 注册表：registerWsServerHandler / registerWsServerCleanup
 * - client ws handler 注册表：registerWsHandler（composables/ws/callbacks）
 * - 命名 slot：profile-extra / settings-extra / nav / header-right / nav-mobile
 *
 * base 必须在 modules 数组中排第一位，确保 i18n / hub / ui 等配置
 * 先于 @nuxthub/core / @nuxt/ui / @nuxtjs/i18n 执行。
 *
 * 开关：NUXT_MODULE_BASE=true 时注册功能（基础配置始终生效）。
 * 同时设置 moduleBase=true 兼容 doc/lms 的 if(moduleBase) 检查。
 */
export default defineNuxtModule({
  meta: { name: 'module-base', configKey: 'modulebase' },
  setup(_options, nuxt) {
    const enabled = process.env.NUXT_MODULE_BASE === 'true'
    if (!enabled) return
    const { resolve } = createResolver(import.meta.url)

    nuxt.hook("hub:db:schema:extend", async ({ dialect, paths }) => {
      // Add your module drizzle schema files for the given dialect
      paths.push(resolve(`./server/db/schema.ts`));
    });

    // ========== 基础配置（原 nuxt.config.ts，需在第三方模块 setup 前设置）==========

    const opts = nuxt.options as any

    // i18n
    // top-level 仅定义 locale code/iso/name，不设 langDir/file（root i18n/ 已移除）。
    // 各模块通过 i18n:registerModule 钩子注册各自 locale 文件（deep-merge）。
    opts.i18n = {
      ...(opts.i18n || {}),
      strategy: 'no_prefix',
      locales: [
        { code: 'en', iso: 'en-US', name: 'English' },
        { code: 'cn', iso: 'zh-CN', name: '中文' },
      ],
      defaultLocale: 'en',
    }

    // @nuxthub/core
    opts.hub = { ...(opts.hub || {}), db: 'postgresql' }

    // @nuxt/ui
    opts.ui = { ...(opts.ui || {}), fonts: false }

    // runtimeConfig 默认值（各模块启用时覆盖为 true）
    opts.runtimeConfig = opts.runtimeConfig || {}
    opts.runtimeConfig.public = {
      ...(opts.runtimeConfig.public || {}),
    }

    // CSS（原 app/assets/css/main.css）
    nuxt.options.css = [...(nuxt.options.css || []), resolve('./assets/css/main.css')]

    // App config（Nuxt UI v3 颜色配置）
    // 每个语义颜色映射到 Tailwind 色板名，未配置的颜色不会生成 CSS 变量，导致样式失效
    nuxt.options.appConfig = nuxt.options.appConfig || {}
      ; (nuxt.options.appConfig as any).ui = {
        ...((nuxt.options.appConfig as any).ui || {}),
        colors: {
          primary: 'green',
          neutral: 'slate',
          info: 'blue',
          success: 'emerald',
          warning: 'amber',
          error: 'red',
          secondary: 'purple',
        },
      }

    // Nitro
    // 注：scheduledTasks 格式为 { [cron]: taskName }（key=cron，value=taskName），
    // 非 { [taskName]: { cron } }，否则 Nitro 会将对象 stringify 为 [object Object]
    nuxt.options.nitro.scheduledTasks = { '0 0 * * *': 'build-search' }
    nuxt.options.nitro = {
      ...nuxt.options.nitro,
      compressPublicAssets: {
        gzip: false,
        brotli: true,
      },
      experimental: {
        ...nuxt.options.nitro.experimental,
        openAPI: true,
        tasks: true,
        websocket: true,
      },
      routeRules: {
        ...nuxt.options.nitro.routeRules,
        //'/api/**': { cors: true },
      }
    }
    // ========== base 模块功能注册（env 控制开关）==========

    // 标记 base 模块已启用，供组件条件渲染使用
    // 同时保留 moduleBase=true 兼容 doc/lms 的 if(moduleBase) 检查
    nuxt.options.runtimeConfig.public.moduleBase = true
    nuxt.options.runtimeConfig.public.modulebase = true

    // 注册组件目录（pathPrefix: true → 子目录作为前缀，如 auth/loginModal.vue → AuthLoginModal）
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // 注册默认布局：引入现有 <Layout> 组件（header/main/footer），供前台页面使用
    addLayout(resolve('./layouts/default.vue'), 'default')

    // 注册 composables / utils 自动导入
    // 注：addImportsDir 不会递归扫描子目录，ws/ 子目录需单独注册
    //     useWsConnection / registerWsHandler 供后续模块跨模块调用
    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./composables/ws'))
    addImportsDir(resolve('./utils'))

    // 注册 pages（合并到主 pages）
    nuxt.hook('pages:extend', (pages) => {
      // base 提供简洁首页 index.vue
      // 注：doc/lms 启用时可覆盖首页
      pages.push({
        name: 'base-home',
        path: '/',
        file: resolve('./pages/index.vue'),
      })
      // 重置密码页
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
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'cn', file: 'cn.json' },
        ],
      })
    })

    // 注册客户端 plugin：恢复登录态
    addPlugin(resolve('./plugins/restore.client.ts'))
    // 注册插件：支持 URL 携带 ?username=&password= 自动登录
    addPlugin(resolve('./plugins/url-auth.client.ts'))

    // 注册插件：站点配置单例预拉取（应用启动时调一次 /api/config/get，结果存 useState）
    addPlugin(resolve('./plugins/site-config.ts'))
    // 注册插件：界面语言决策（个人语言 > 站点默认语言 > en）
    addPlugin(resolve('./plugins/locale-default.ts'))
  },
})
