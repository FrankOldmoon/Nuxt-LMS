import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin } from '@nuxt/kit'

/**
 * lms module
 *
 * 在线学习系统：师生角色、question 等互动组件、章节/课程功能按钮与互动数据、
 * 班级选择与数据、课程学习数据。组件按 course/chapter/class 分类。
 *
 * 依赖：base（cRequest、WS 连接层、通用 CRUD、form）、doc（courses/chapters 内容）、auth（users）
 *
 * 脚手架阶段：NUXT_MODULE_LMS=false 时跳过注册，使用原始文件。
 */
export default defineNuxtModule({
  meta: { name: 'module-lms', configKey: 'moduleLms' },
  setup(_options, nuxt) {
    const enabled = process.env.NUXT_MODULE_LMS === 'true'
    if (!enabled) return

    const { resolve } = createResolver(import.meta.url)

    // 标记 lms 模块已启用，供组件条件渲染使用
    nuxt.options.runtimeConfig.public.moduleLms = true

    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Nuxt 的 addComponentsDir 对同名组件采用"先注册者胜"策略，
    // doc 模块（先注册）的 layout/aside、layout/toc、course/card 会遮蔽 lms 版本。
    // 用 components:extend 钩子将这 3 个组件的 filePath 指向 lms 版本，
    // 使 lms 启用时其增强版（含工具栏按钮、ChapterBtns 等）生效。
    // lms 未启用时，doc 版本仍正常使用。
    nuxt.hook('components:extend', (components) => {
      const overrides: Record<string, string> = {
        LayoutAside: resolve('./components/layout/aside.vue'),
        LayoutToc: resolve('./components/layout/toc.vue'),
        CourseCard: resolve('./components/course/card.vue'),
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

    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./utils'))

    nuxt.hook('pages:extend', (pages) => {
      // 移除 base/doc 的首页和课程路由，避免路径冲突（lms 覆盖全部）
      const pathsToRemove = ['/', '/course/:id', '/course/:id/:cid']
      for (let i = pages.length - 1; i >= 0; i--) {
        if (pathsToRemove.includes(pages[i].path || '')) {
          pages.splice(i, 1)
        }
      }

      pages.push({
        name: 'lms-home',
        path: '/',
        file: resolve('./pages/index.vue'),
      })
      pages.push({
        name: 'lms-course',
        path: '/course/:id',
        file: resolve('./pages/course/[id]/index.vue'),
      })
      pages.push({
        name: 'lms-chapter',
        path: '/course/:id/:cid',
        file: resolve('./pages/course/[id]/[cid].vue'),
      })
    })

    addServerScanDir(resolve('./server'))

    // 客户端插件：监听 chapterAccessUpdate WS 消息，刷新当前课程侧边栏导航
    // （教师在 accessBar 切换章节 isOpen 或开放给班级时，服务端广播此消息）
    addPlugin(resolve('./plugins/ws-sync.client.ts'))

    nuxt.hook('i18n:registerModule', () => ({
      langDir: resolve('./i18n/locales'),
      locales: [{ code: 'en', file: 'en.json' }],
    }))

    // WS 回调：vote/quickAnswer/race/group/chatroom/online 等由 lms 组件
    // 通过 useWebSocket().onXxx(cb) → registerWsHandler('xxx', cb) 注册到 base 连接层
  },
})
