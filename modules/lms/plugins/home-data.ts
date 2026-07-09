/**
 * 首页数据单例插件
 *
 * - 应用启动时（SSR + 客户端首次加载）调用一次 /api/home
 * - 结果存入 useState('home-data')，所有组件通过 useHome() 共享同一份数据
 *
 * 收益：
 * - 整个应用只有 1 个 useState 数据源
 * - 多个 computed 派生自同一份数据
 * - WS 广播 home-changed 触发 refreshNuxtData(key) 自动同步到 useState
 * - 任何组件调用 useHome() 都不会产生新的 useFetch / 新的 network 请求
 *
 * 刷新机制：
 * - refreshNuxtData('home-singleton-fetch') 通过 key 触发刷新
 *   不需要保存 refresh 函数引用，Nuxt 自己会查 key 找到对应的 useFetch 并调用其 refresh
 * - categories/add|update|batch.post.ts 与 courses/add|update|batch|delete|import.post.ts
 *   服务端写库后 broadcastToAll({ type: 'home-changed' })
 *   所有客户端 useHome() 内部注册的 WS handler 触发 refreshNuxtData
 */
export default defineNuxtPlugin(async () => {
  // 初始化共享 state（与 useHome 共用同一 key）
  const data = useState<any>('home-data', () => ({
    categories: [],
    courses: [],
    config: null,
    notifyUnread: 0,
    msgUnread: 0,
  }))

  // 首次拉取：SSR 阻塞首屏等待数据，客户端用 payload（不产生额外请求）
  const { data: fetched } = await useFetch<any>('/api/home', {
    key: 'home-singleton-fetch',
  })

  // 监听 data 变化（initial + 每次 refreshNuxtData），同步到共享 state
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
