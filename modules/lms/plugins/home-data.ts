/**
 * Homepage data singleton plugin
 *
 * - Calls /api/home once at app startup (SSR + first client load)
 * - Result is stored in useState('home-data'); all components share the same data via useHome()
 *
 * Benefits:
 * - Only 1 useState data source across the entire app
 * - Multiple computed values derive from the same data
 * - WS broadcasts home-changed triggers refreshNuxtData(key) to auto-sync to useState
 * - Any component calling useHome() will not create new useFetch / new network requests
 *
 * Refresh mechanism:
 * - refreshNuxtData('home-singleton-fetch') triggers refresh by key
 *   No need to keep a reference to the refresh function; Nuxt will look up the key
 *   to find the corresponding useFetch and call its refresh
 * - categories/add|update|batch.post.ts and courses/add|update|batch|delete|import.post.ts
 *   broadcastToAll({ type: 'home-changed' }) after server-side writes
 *   The WS handler registered inside useHome() on all clients triggers refreshNuxtData
 */
export default defineNuxtPlugin(async () => {
  // Initialize shared state (shares the same key with useHome)
  const data = useState<any>('home-data', () => ({
    categories: [],
    courses: [],
    config: null,
    notifyUnread: 0,
    msgUnread: 0,
  }))

  // First fetch: SSR blocks first paint until data is ready; client reuses payload (no extra request)
  const { data: fetched } = await useFetch<any>('/api/home', {
    key: 'home-singleton-fetch',
  })

  // Watch data changes (initial + every refreshNuxtData) and sync to shared state
  watch(
    fetched,
    (newData) => {
      const payload = newData?.data ?? newData
      if (payload && typeof payload === 'object' && !('success' in payload)) {
        data.value = payload
      } else if (payload?.data && typeof payload.data === 'object') {
        data.value = payload.data
      }
    },
    { immediate: true, deep: true }
  )
})
