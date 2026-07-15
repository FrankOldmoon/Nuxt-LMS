import { defineNuxtModule, createResolver, addComponentsDir, addImportsDir, addServerScanDir, addPlugin, addLayout } from '@nuxt/kit'

/**
 * admin module — backend dashboard table management
 *
 * Features:
 * - /dashboard dashboard: statistics visualization (reuses base's <Chart>)
 * - Left menu: UNavigationMenu generates buttons for each table in the database, supports editing labels / sorting / hiding,
 *   stored in the configs table (key=admin:menu). On small screens it becomes a left floating drawer.
 * - Right table management: combines base's /api/crud/[table] to implement CRUD; columns are dynamically displayed based on the column definitions returned by the API;
 *   pagination / sorting / hidden columns; top multi-condition filtering; trash bin (soft-delete recovery and permanent deletion, supports batch);
 *   import/export (reuses base's <Sheet>).
 * - cellView: custom rendering by column type (image preview, date localization, etc.), cshow reused to preview row details.
 * - cform: personalized add / edit forms by column type (date picker, foreign key select, etc.).
 *
 * Dependencies: base (cRequest, auth, generic CRUD, <Chart>, <Sheet>)
 *
 * Switch: registers features when NUXT_MODULE_ADMIN=true.
 */
export default defineNuxtModule({
  meta: { name: 'module-admin', configKey: 'moduleAdmin' },
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Mark admin module enabled status, for conditional rendering of components
    const enabled = process.env.NUXT_MODULE_ADMIN === 'true'
    nuxt.options.runtimeConfig.public.moduleAdmin = enabled
    if (!enabled) return

    // Register components directory (pathPrefix: true → subdirectory as prefix, e.g. table/Manager.vue → <TableManager>)
    addComponentsDir({ path: resolve('./components'), pathPrefix: true })

    // Register admin layout: independent shell (its own top bar + left menu + content), without base's header/footer
    addLayout(resolve('./layouts/admin.vue'), 'admin')

    // Register composables / utils auto-import
    addImportsDir(resolve('./composables'))
    addImportsDir(resolve('./utils'))

    // Register server routes / utils
    addServerScanDir(resolve('./server'))

    // Register pages (merged into main pages) — nested routes: parent shell dashboard.vue + child pages, so the left menu is shared across all /dashboard/*
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

    // Register i18n locale
    nuxt.hook('i18n:registerModule', (registerModule) => {
      registerModule({
        langDir: resolve('./i18n/locales'),
        locales: [{ code: 'en', file: 'en.json' }],
      })
    })

    // Client plugin: admin backend access guard
    addPlugin(resolve('./plugins/admin-guard.client.ts'))

    // Table personalization override plugin: only registered when lms is enabled (override components import LMS components, not compiled when lms is off)
    if (process.env.NUXT_MODULE_LMS === 'true') {
      addPlugin(resolve('./plugins/overrides.ts'))
    }
  },
})
