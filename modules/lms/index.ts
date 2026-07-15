import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin } from '@nuxt/kit'

/**
 * lms module
 *
 * Online learning system: teacher/student roles, interactive components such as question,
 * chapter/course feature buttons and interaction data, class selection and data,
 * and course learning data. Components are categorized by course/chapter/class.
 *
 * Dependencies: base (cRequest, WS connection layer, generic CRUD, form),
 * doc (courses/chapters content), auth (users)
 *
 * Scaffolding phase: when NUXT_MODULE_LMS=false, skip registration and use the original files.
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

    // Mark lms module as enabled, for conditional rendering in components
    nuxt.options.runtimeConfig.public.moduleLms = true

    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Nuxt's addComponentsDir uses a "first registered wins" strategy for components with the same name,
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
      // Remove base/doc home and course routes to avoid path conflicts (lms overrides all)
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

    // Override base module same-path API: both base and lms add their
    // server directory to nitro:config's scanDirs via addServerScanDir.
    // Nitro scans in order, first registered wins. By default base calls
    // addScanDir first (base is earlier in the modules array), so base wins.
    // Here we use the nitro:config hook to move lms/server to the front of
    // scanDirs, so lms is scanned first; any lms handler with the same
    // route+method is registered before base, and Nitro deduplication keeps
    // the lms version, thereby achieving lms overriding base.
    nuxt.hook('nitro:config', (config) => {
      const lmsServerDir = resolve('./server')
      const dirs = config.scanDirs ||= []
      const filtered = dirs.filter((d: string) => d !== lmsServerDir)
      filtered.unshift(lmsServerDir)
      config.scanDirs = filtered
    })


    // Client plugin: listen for chapterAccessUpdate WS messages to refresh the current course sidebar navigation
    // (when a teacher toggles a chapter's isOpen or opens it to a class in accessBar, the server broadcasts this message)
    addPlugin(resolve('./plugins/ws-sync.client.ts'))

    // Shared data singleton plugin: pre-fetch /api/home and /api/config/lms-public once on app startup,
    // store into useState so all components share the same data via useHome() / useLmsPublicConfig().
    // Note: the module's plugins/ directory is not auto-discovered by Nuxt, must explicitly addPlugin() to register
    // (refer to the base module's site-config.ts registration approach).
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
