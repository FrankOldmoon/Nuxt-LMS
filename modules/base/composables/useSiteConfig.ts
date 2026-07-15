import { computed } from "vue"

/**
 * useSiteConfig — public site config (SSR compatible, singleton)
 *
 * Data source: /api/config/get
 *   - Pre-fetched by plugins/site-config.ts on app startup, result stored in useState('site-config')
 *   - Client gets SSR data directly via Nuxt payload, no additional request
 *
 * Returned fields: siteTitle / siteDescription / siteLogo / siteFavicon /
 *          siteFooterText / defaultLocale / pageSize /
 *          allowRegistration / allowForgotPassword / maintenanceMode /
 *          showNotify / showMsg / showMyFiles
 *
 * Performance:
 * - Only 1 useState data source for the entire app
 * - 6 computed values derived from the same data
 * - N components calling useSiteConfig() will not create new useFetch / new network requests
 *
 * Real-time update: WS broadcast 'site-config-changed' triggers refreshNuxtData(key),
 *   the watch in plugins/site-config.ts auto-syncs to useState
 *   - WS handler registered only once via module-level flag (avoid duplicate registration)
 *   - refreshNuxtData is a Nuxt built-in function, finds the useFetch instance via key and triggers its refresh,
 *     no need to save function reference (devalue cannot serialize functions)
 */

// Shares the same key with the useFetch in plugins/site-config.ts
const FETCH_KEY = 'site-config-singleton-fetch'

// Module-level flag: ensures WS handler is registered only once during the entire app lifecycle
let _wsHandlerRegistered = false

export function useSiteConfig() {
  // Single data source (shares the same key with plugins/site-config.ts)
  const config = useState<{ [key: string]: any }>('site-config', () => ({}))

  // Derived computed (calculated from the same data, no extra network requests)
  const siteTitle = computed(() => config.value?.siteTitle || 'AI LMS')
  const logo = computed(() => config.value?.siteLogo || '')
  const allowRegistration = computed(() => config.value?.allowRegistration ?? false)
  const showNotify = computed(() => config.value?.showNotify ?? true)
  const showMsg = computed(() => config.value?.showMsg ?? true)
  const showMyFiles = computed(() => config.value?.showMyFiles ?? true)

  // Client-side: subscribe to server site-config-changed broadcast, auto refresh
  // Register handler only on first call (module-level flag), avoid N components calling → N registrations → N refreshes
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      // Call connect() to ensure WS is established (ws.vue also triggers, but component may not be mounted yet)
      try { useWsConnection().connect() } catch { /* ignore */ }
      // registerWsHandler is auto-imported via addImportsDir
      // (modules/base/composables/ws/callbacks.ts)
      registerWsHandler('site-config-changed', () => {
        // Find the useFetch in plugins/site-config.ts via key and trigger its refresh
        // refreshNuxtData is a Nuxt built-in function, auto-imported
        // After refresh completes, useFetch's data updates → watch syncs to useState
        refreshNuxtData(FETCH_KEY)
      })
    } catch {
      // WS module not enabled (base stub mode), silently ignore
    }
  }

  return {
    siteTitle,
    logo,
    allowRegistration,
    showNotify,
    showMsg,
    showMyFiles,
    // Backward compatibility: config field returns useState ref
    config: config as any,
    // Manual refresh: call refreshNuxtData(key), watch auto-syncs to useState
    refreshConfig: () => refreshNuxtData(FETCH_KEY),
  }
}
