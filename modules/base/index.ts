import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin } from '@nuxt/kit'

/**
 * base module（已合并 auth）
 *
 * 功能：
 * - 基本页面布局（header/main/footer）、form 共用组件、共享 utils（cRequest 等）
 * - 系统设置、WebSocket 连接层、通用 CRUD
 * - 登录/注册/忘记密码、前后端身份认证、个人资料管理
 * - 系统通知、个人网盘、消息收发
 * - schema：roles/permissions/configs/files/users/tokens/userRoles/userClasses/notifys/messages
 *
 * 脚手架阶段：NUXT_MODULE_BASE=false 时跳过注册，使用原始文件。
 * 后续移除原始文件后置 true 即可启用。
 */
export default defineNuxtModule({
  meta: { name: 'module-base', configKey: 'moduleBase' },
  setup(_options, nuxt) {
    const enabled = process.env.NUXT_MODULE_BASE === 'true'
    if (!enabled) return

    const { resolve } = createResolver(import.meta.url)

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

    // 注册 i18n locale
    nuxt.hook('i18n:registerModule', () => ({
      langDir: resolve('./i18n/locales'),
      locales: [{ code: 'en', file: 'en.json' }],
    }))

    // 注册客户端 plugin：恢复登录态（原 auth module）
    addPlugin(resolve('./plugins/restore.client.ts'))
  },
})
