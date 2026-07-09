/**
 * LMS 公开配置单例插件
 *
 * - 应用启动时（SSR + 客户端首次加载）调用一次 /api/config/lms-public
 * - 结果存入 useState('lms-public-config')，所有组件通过 useLmsPublicConfig() 共享同一份数据
 *
 * 收益：
 * - 整个应用只有 1 个 useState 数据源
 * - 多个 computed 派生自同一份数据
 * - WS 广播 lms-config-changed 触发 refreshNuxtData(key) 自动同步到 useState
 * - 任何组件调用 useLmsPublicConfig() 都不会产生新的 useFetch / 新的 network 请求
 *
 * 刷新机制：
 * - refreshNuxtData('lms-public-config-singleton-fetch') 通过 key 触发刷新
 *   不需要保存 refresh 函数引用，Nuxt 自己会查 key 找到对应的 useFetch 并调用其 refresh
 */
export default defineNuxtPlugin(async () => {
  // 初始化共享 state（与 useLmsPublicConfig 共用同一 key）
  const config = useState<{ [key: string]: any }>('lms-public-config', () => ({}))

  // 首次拉取：SSR 阻塞首屏等待数据，客户端用 payload（不产生额外请求）
  const { data } = await useFetch<any>('/api/config/lms-public', {
    key: 'lms-public-config-singleton-fetch',
  })

  // 监听 data 变化（initial + 每次 refreshNuxtData），同步到共享 state
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
