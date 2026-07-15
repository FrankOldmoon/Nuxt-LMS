import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin, addLayout, resolvePath } from '@nuxt/kit'
import fs from 'fs'

/**
 * base module (refactored version of base module, self-contained, unaware of doc/lms)
 *
 * Features:
 * - Basic configuration (i18n / hub / ui / nitro / css / runtimeConfig / appConfig)
 * - Basic page layout (header/main/footer), form shared components, shared utils (cRequest, etc.)
 * - System settings (flattened key storage), WebSocket connection layer, generic CRUD
 * - Login/register/forgot password, front-end and back-end authentication, profile management
 * - System notifications, personal cloud disk, messaging
 * - schema: roles/permissions/configs/files/users/tokens/userRoles/notifys/messages
 *
 * Extension points (for subsequent modules to reference, base itself is unaware of subsequent modules):
 * - server hooks: runOnMeEnrich / runOnUserImported
 * - ws handler registry: registerWsServerHandler / registerWsServerCleanup
 * - client ws handler registry: registerWsHandler (composables/ws/callbacks)
 * - named slots: profile-extra / settings-extra / nav / header-right / nav-mobile
 *
 * base must be first in the modules array to ensure i18n / hub / ui configurations
 * execute before @nuxthub/core / @nuxt/ui / @nuxtjs/i18n.
 *
 * Switch: registers features when NUXT_MODULE_BASE=true (basic configuration always takes effect).
 * Also sets moduleBase=true for compatibility with doc/lms if(moduleBase) checks.
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

    // ========== Basic configuration (originally nuxt.config.ts, must be set before third-party module setup) ==========

    const opts = nuxt.options as any

    // i18n
    // top-level only defines locale code/iso/name, no langDir/file (root i18n/ has been removed).
    // Each module registers its own locale files via i18n:registerModule hook (deep-merge).
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

    // runtimeConfig default values (overridden to true when each module is enabled)
    opts.runtimeConfig = opts.runtimeConfig || {}
    opts.runtimeConfig.public = {
      ...(opts.runtimeConfig.public || {}),
    }

    // CSS (originally app/assets/css/main.css)
    nuxt.options.css = [...(nuxt.options.css || []), resolve('./assets/css/main.css')]

    // App config (Nuxt UI v3 color configuration)
    // Each semantic color maps to a Tailwind palette name, unconfigured colors will not generate CSS variables, causing styles to fail
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
    // Note: scheduledTasks format is { [cron]: taskName } (key=cron, value=taskName),
    // not { [taskName]: { cron } }, otherwise Nitro will stringify the object to [object Object]
    nuxt.options.nitro.scheduledTasks = { '0 0 * * *': 'build-search' }
    nuxt.options.nitro = {
      ...nuxt.options.nitro,
      compressPublicAssets: {
        gzip: true,
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
        '/api/**': { cors: true },
      }
    }
    // ========== base module feature registration (env-controlled switch) ==========

    // Mark base module as enabled, for component conditional rendering
    // Also keep moduleBase=true for compatibility with doc/lms if(moduleBase) checks
    nuxt.options.runtimeConfig.public.moduleBase = true
    nuxt.options.runtimeConfig.public.modulebase = true

    // Register component directory (pathPrefix: true → subdirectory as prefix, e.g. auth/loginModal.vue → AuthLoginModal)
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Register default layout: import existing <Layout> component (header/main/footer), for front-end pages
    addLayout(resolve('./layouts/default.vue'), 'default')

    // Register composables / utils auto-import
    // Note: addImportsDir does not recursively scan subdirectories, ws/ subdirectory needs separate registration
    //     useWsConnection / registerWsHandler for cross-module calls by subsequent modules
    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./composables/ws'))
    addImportsDir(resolve('./utils'))

    // Register pages (merged into main pages)
    nuxt.hook('pages:extend', (pages) => {
      // base provides a simple homepage index.vue
      // Note: can be overridden by doc/lms when enabled
      pages.push({
        name: 'base-home',
        path: '/',
        file: resolve('./pages/index.vue'),
      })
      // Reset password page
      pages.push({
        name: 'auth-reset-password',
        path: '/reset-password',
        file: resolve('./pages/reset-password.vue'),
      })
    })

    // Register server routes / utils / middleware / plugins / tasks
    addServerScanDir(resolve('./server'))

    // Register i18n locale (note: must call registerModule callback, not return config)
    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [{ code: 'en', file: 'en.json' }],
      })
    })

    // Register client plugin: restore login state
    addPlugin(resolve('./plugins/restore.client.ts'))

    // Register plugin: site config singleton pre-fetch (call /api/config/get once on app startup, store result in useState)
    addPlugin(resolve('./plugins/site-config.ts'))
  },
})
