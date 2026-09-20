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
      const pathsToRemove = ['/', '/course/:id', '/course/:id/:cid', '/course/:id/3d']
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
      // 课程 3D「知识星系」可视化（所有登录用户可访问）
      pages.push({
        name: 'lms-course-3d',
        path: '/course/:id/3d',
        file: resolve('./pages/course/[id]/3d.vue'),
      })
      // 学生作品展示
      pages.push({
        name: 'lms-showcase',
        path: '/showcase',
        file: resolve('./pages/showcase/index.vue'),
      })
      pages.push({
        name: 'lms-showcase-detail',
        path: '/showcase/:id',
        file: resolve('./pages/showcase/[id].vue'),
      })
    })

    addServerScanDir(resolve('./server'))

    // 覆盖 base 模块同路径 API：base 与 lms 都通过 addServerScanDir 把
    // server 目录加入 nitro:config 的 scanDirs，Nitro 按顺序扫描，先注册者胜。
    // 默认 base 先 addScanDir（modules 数组中 base 在前），base 胜出。
    // 此处用 nitro:config hook 把 lms/server 移到 scanDirs 最前，使 lms 先被
    // 扫描；任何同 route+method 的 lms handler 会先于 base 注册，Nitro 去重
    // 时保留 lms 版本，从而实现 lms 覆盖 base。
    nuxt.hook('nitro:config', (config) => {
      const lmsServerDir = resolve('./server')
      const dirs = config.scanDirs ||= []
      const filtered = dirs.filter((d: string) => d !== lmsServerDir)
      filtered.unshift(lmsServerDir)
      config.scanDirs = filtered
    })


    // 客户端插件：监听 chapterAccessUpdate WS 消息，刷新当前课程侧边栏导航
    // （教师在 accessBar 切换章节 isOpen 或开放给班级时，服务端广播此消息）
    addPlugin(resolve('./plugins/ws-sync.client.ts'))

    // 共享数据单例插件：应用启动时预拉取一次 /api/home 和 /api/config/lms-public，
    // 存入 useState 后所有组件通过 useHome() / useLmsPublicConfig() 共享同一份数据。
    // 注：模块 plugins/ 目录不会被 Nuxt 自动发现，必须显式 addPlugin() 注册
    // 首屏引导：一次 /api/bootstrap 带回 站点配置 + LMS 公开配置 + 首页数据
    // （合并了原 home-data.ts / lms-public-config.ts 两个插件）
    addPlugin(resolve('./plugins/bootstrap.ts'))

    // 客户端站点统计（谷歌分析 / 百度统计）：配置就绪后注入脚本并执行
    addPlugin(resolve('./plugins/analytics.ts'))

    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [
          { code: 'en', file: 'en.json' },
          { code: 'cn', file: 'cn.json' },
        ],
      })
    })

  },
})
