/**
 * LMS public config singleton plugin
 *
 * - Calls /api/config/lms-public once at app startup (SSR + first client load)
 * - Result is stored in useState('lms-public-config'); all components share the same data via useLmsPublicConfig()
 *
 * Benefits:
 * - Only 1 useState data source across the entire app
 * - Multiple computed values derive from the same data
 * - WS broadcasts lms-config-changed triggers refreshNuxtData(key) to auto-sync to useState
 * - Any component calling useLmsPublicConfig() will not create new useFetch / new network requests
 *
 * Refresh mechanism:
 * - refreshNuxtData('lms-public-config-singleton-fetch') triggers refresh by key
 *   No need to keep a reference to the refresh function; Nuxt will look up the key
 *   to find the corresponding useFetch and call its refresh
 */
export default defineNuxtPlugin(async () => {
  // Initialize shared state (shares the same key with useLmsPublicConfig)
  const config = useState<{ [key: string]: any }>('lms-public-config', () => ({}))

  // First fetch: SSR blocks first paint until data is ready; client reuses payload (no extra request)
  const { data } = await useFetch<any>('/api/config/lms-public', {
    key: 'lms-public-config-singleton-fetch',
  })

  // Watch data changes (initial + every refreshNuxtData) and sync to shared state
  watch(
    data,
    (newData) => {
      const payload = newData?.data ?? newData
      if (payload && typeof payload === 'object' && !('success' in payload)) {
        config.value = payload
      } else if (payload?.data && typeof payload.data === 'object') {
        config.value = payload.data
      }
    },
    { immediate: true, deep: true }
  )
})
