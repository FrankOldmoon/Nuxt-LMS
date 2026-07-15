/**
 * useLmsPublicConfig — Public LMS configuration composable (SSR compatible, singleton)
 *
 * Data source: /api/config/lms-public
 *   - Returns home / courseList / chapterPage / course / chapterBtns / courseBtns / user
 *     / ai public fields
 *   - Excludes sensitive ai.llmApiKey / ai.llmApiUrl
 *
 * Singleton mechanism (consistent with useSiteConfig):
 *   - plugins/lms-public-config.ts calls useFetch once at app startup to fetch data
 *   - Data is stored in useState('lms-public-config'), all components share the same instance
 *   - Client hydration is restored directly from the payload, no new request is made
 *
 * Real-time updates:
 *   - WS broadcast 'lms-config-changed' triggers refreshNuxtData('lms-public-config-singleton-fetch')
 *   - useState auto-syncs → all computed values auto-update
 *
 * Usage:
 *   const { home, courseList, chapterPage, course, chapterBtns, courseBtns,
 *           user, ai, refresh } = useLmsPublicConfig()
 *   v-if="home.showHero"
 *   v-if="chapterPage.showOutline"
 */

// Module-level flag: WS handler is only registered once during the entire app lifecycle
let _wsHandlerRegistered = false

export function useLmsPublicConfig() {
  // Single source of truth (shares the same key with plugins/lms-public-config.ts)
  const config = useState<{ [key: string]: any }>('lms-public-config', () => ({}))

  // Derived computed values for each group (with default fallbacks, providing safe defaults when not loaded yet)
  const home = computed(() => config.value?.home || { showHero: true, showStats: true, showRecentCourses: true, showLeaderboard: true })
  const courseList = computed(() => config.value?.courseList || { showSearch: true, showFilter: true, showSort: true, defaultView: 'grid' })
  const chapterPage = computed(() => config.value?.chapterPage || { showOutline: true, showNote: true, showDanmakuPanel: true, enableFullscreen: true })
  const course = computed(() => config.value?.course || {})
  const chapterBtns = computed(() => config.value?.chapterBtns || {})
  const courseBtns = computed(() => config.value?.courseBtns || {})
  const user = computed(() => config.value?.user || {})
  const ai = computed(() => config.value?.ai || {})

  // Client side: subscribe to server-side lms-config-changed broadcast, auto refresh
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      // Ensure WS is established
      try { useWsConnection().connect() } catch { /* ignore */ }
      registerWsHandler('lms-config-changed', () => {
        // Find the useFetch in plugins/lms-public-config.ts by key and trigger its refresh
        // After refresh completes, useFetch's data updates → plugin watch syncs to useState
        refreshNuxtData('lms-public-config-singleton-fetch')
      })
    } catch {
      // WS module not enabled (base stub mode), silently ignore
    }
  }

  return {
    config,
    home,
    courseList,
    chapterPage,
    course,
    chapterBtns,
    courseBtns,
    user,
    ai,
    // Manual refresh (consistent with useSiteConfig: trigger useFetch refresh via key)
    refresh: () => refreshNuxtData('lms-public-config-singleton-fetch'),
  }
}
