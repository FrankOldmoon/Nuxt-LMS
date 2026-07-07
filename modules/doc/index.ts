import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir } from '@nuxt/kit'

/**
 * doc module
 *
 * 文档编辑和展示功能：ueditor 及各类拓展、课程和目录编辑展示。
 * ueditor 拓展组件结构：原始 component + Render（复用原始）+ Edit（包含 Render）。
 * 加载此 module 时，实现类似 nuxt-doc 的在线文档展示系统。
 *
 * 依赖：base module（cRequest、WS 连接层、通用 CRUD、form 组件）
 *
 * 脚手架阶段：NUXT_MODULE_DOC=false 时跳过注册，使用原始文件。
 */
export default defineNuxtModule({
  meta: { name: 'module-doc', configKey: 'moduleDoc' },
  setup(_options, nuxt) {
    const enabled = process.env.NUXT_MODULE_DOC === 'true'
    if (!enabled) return

    const { resolve } = createResolver(import.meta.url)

    // 标记 doc 模块已启用，供组件条件渲染使用（如 header 中的搜索按钮）
    nuxt.options.runtimeConfig.public.moduleDoc = true

    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Nuxt 的 addComponentsDir 对同名组件采用"先注册者胜"策略，
    // base 模块（先注册）的 LayoutHeader 会遮蔽 doc 版本。
    // 用 components:extend 钩子将 LayoutHeader 的 filePath 指向 doc 版本，
    // 使 doc 启用时其增强版（含导航、搜索）生效。
    // doc 未启用时，base 版本仍正常使用。
    nuxt.hook('components:extend', (components) => {
      const overrides: Record<string, string> = {
        LayoutHeader: resolve('./components/layout/header/index.vue'),
        Layout: resolve('./components/layout/index.vue'),
        LayoutMain: resolve('./components/layout/main.vue'),
      }
      for (const [name, filePath] of Object.entries(overrides)) {
        const comp = components.find(c => c.pascalName === name)
        if (comp) {
          comp.filePath = filePath
          ;(comp as any).shortPath = filePath.replace(nuxt.options.srcDir + '/', '')
          ;(comp as any).chunkName = `components/${name.toLowerCase()}`
        }
      }
    })

    addImportsDir(resolve('./utils'))
    addImportsDir(resolve('./composables'))

    // lms 未启用时注册 doc stubs（useClassUsers/useChapterTask）
    // lms 启用时由 lms 模块提供完整实现，
    // 此处不注册以避免 "Duplicated imports" 警告
    // 注意：useChapterBtns 已迁移为 doc 正式实现（播放按钮在 toc.vue），不再需要 stub
    if (process.env.NUXT_MODULE_LMS !== 'true') {
      addImportsDir(resolve('./composables/stubs'))
    }

    nuxt.hook('pages:extend', (pages) => {
      // 移除 base 的首页路由，避免路径冲突（后注册的 doc 覆盖 base 的 / ）
      const baseHomeIdx = pages.findIndex((p) => p.path === '/')
      if (baseHomeIdx !== -1) pages.splice(baseHomeIdx, 1)

      pages.push(
        { name: 'doc-home', path: '/', file: resolve('./pages/index.vue') },
        { name: 'doc-course', path: '/course/:id', file: resolve('./pages/course/[id]/index.vue') },
        { name: 'doc-chapter', path: '/course/:id/:cid', file: resolve('./pages/course/[id]/[cid].vue') },
        { name: 'doc-editor', path: '/editor', file: resolve('./pages/editor.vue') },
      )
    })

    addServerScanDir(resolve('./server'))

    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [{ code: 'en', file: 'en.json' }],
      })
    })

    // 注册 WS 回调：lockJoin/lockRelease（编辑锁）注册到 base 连接层
    // 由 ueditor/ws.vue 调用 registerWsHandler('lockAcquired'/'lockDenied', cb)
  },
})
