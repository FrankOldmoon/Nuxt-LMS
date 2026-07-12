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
    const { resolve } = createResolver(import.meta.url)

    nuxt.hook("hub:db:schema:extend", async ({ dialect, paths }) => {
      // Add your module drizzle schema files for the given dialect
      paths.push(resolve(`./server/db/schema.ts`));
    });

    // #lms 别名指向 lms 模块根目录，供 #lms/types/lms 类型导入使用。
    // 始终注册（即使 lms 功能未启用），因为类型文件NUXT_MODULE_LMS。
    nuxt.options.alias['#lms'] = resolve('.')

    const enabled = process.env.NUXT_MODULE_LMS === 'true'
    if (!enabled) return

    // 标记 lms 模块已启用，供组件条件渲染使用
    nuxt.options.runtimeConfig.public.moduleLms = true

    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Nuxt 的 addComponentsDir 对同名组件采用"先注册者胜"策略，
    nuxt.hook('components:extend', (components) => {
      const overrides: Record<string, string> = {
        LayoutAside: resolve('./components/layout/aside.vue'),
        LayoutToc: resolve('./components/layout/toc/index.vue'),
        LayoutHeader: resolve('./components/layout/header/index.vue'),
        Layout: resolve('./components/layout/index.vue'),
        LayoutMain: resolve('./components/layout/main.vue'),
        AuthSettingsModal: resolve('./components/auth/settingsModal.vue'),
        CourseEditorConfigForm: resolve('./components/course/editor/configForm.vue'),
      }
      for (const [name, filePath] of Object.entries(overrides)) {
        const comp = components.find(c => c.pascalName === name)
        if (comp) {
          comp.filePath = filePath
            ; (comp as any).shortPath = filePath.replace(nuxt.options.srcDir + '/', '')
            ; (comp as any).chunkName = `components/${name.toLowerCase()}`
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

    // 共享数据单例插件：应用启动时预拉取一次 /api/home 和 /api/config/lms-public，
    // 存入 useState 后所有组件通过 useHome() / useLmsPublicConfig() 共享同一份数据。
    // 注：模块 plugins/ 目录不会被 Nuxt 自动发现，必须显式 addPlugin() 注册
    // （参考 base 模块的 site-config.ts 注册方式）。
    addPlugin(resolve('./plugins/home-data.ts'))
    addPlugin(resolve('./plugins/lms-public-config.ts'))

    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [{ code: 'en', file: 'en.json' }],
      })
    })

  },
})
