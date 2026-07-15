/**
 * Site config singleton plugin
 *
 * - Called once on app startup (SSR + client first load) to /api/config/get
 * - Result stored in useState('site-config'), all components share the same data via useSiteConfig()
 *
 * Benefits:
 * - Only 1 useState data source for the entire app
 * - 6 computed values derived from the same data
 * - WS broadcast site-config-changed triggers refreshNuxtData(key) to auto-sync to useState
 * - Any component calling useSiteConfig() does not create a new useFetch / new network request
 *
 * Refresh mechanism:
 * - useState uses devalue for serialization under the hood, **cannot store functions**
 * - Use Nuxt built-in refreshNuxtData('site-config-singleton-fetch') to trigger refresh via key
 *   (no need to save refresh function reference, Nuxt will look up the key to find the corresponding useFetch and call its refresh)
 */
export default defineNuxtPlugin(async () => {
  // Initialize shared state (shares the same key with useSiteConfig)
  const config = useState<{ [key: string]: any }>('site-config', () => ({}))

  // First fetch: SSR blocks first screen waiting for data, client uses payload (no extra request)
  const { data } = await useFetch<{ data?: { [key: string]: any } } | any>(
    '/api/config/get',
    {
      // Explicit key: refreshNuxtData uses this key to find this useFetch instance
      key: 'site-config-singleton-fetch',
    }
  )

  // Watch data changes (initial + each refreshNuxtData), sync to shared state
  // Compatible with both cResp wrapper ({ success, data, message }) and direct object return
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
