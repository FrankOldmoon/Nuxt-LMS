/**
 * 站点配置单例插件
 *
 * - 应用启动时（SSR + 客户端首次加载）调用一次 /api/config/get
 * - 结果存入 useState('site-config')，所有组件通过 useSiteConfig() 共享同一份数据
 *
 * 收益：
 * - 整个应用只有 1 个 useState 数据源
 * - 6 个 computed 派生自同一份数据
 * - WS 广播 site-config-changed 触发 refreshNuxtData(key) 自动同步到 useState
 * - 任何组件调用 useSiteConfig() 都不会产生新的 useFetch / 新的 network 请求
 *
 * 刷新机制：
 * - useState 底层用 devalue 序列化，**不能存函数**
 * - 改用 Nuxt 内置 refreshNuxtData('site-config-singleton-fetch') 通过 key 触发刷新
 *   （不需要保存 refresh 函数引用，Nuxt 自己会查 key 找到对应的 useFetch 并调用其 refresh）
 */
export default defineNuxtPlugin(async () => {
  // 初始化共享 state（与 useSiteConfig 共用同一 key）
  const config = useState<{ [key: string]: any }>('site-config', () => ({}))

  // 首次拉取：SSR 阻塞首屏等待数据，客户端用 payload（不产生额外请求）
  const { data } = await useFetch<{ data?: { [key: string]: any } } | any>(
    '/api/config/get',
    {
      // 显式 key：refreshNuxtData 用这个 key 找到此 useFetch 实例
      key: 'site-config-singleton-fetch',
    }
  )

  // 监听 data 变化（initial + 每次 refreshNuxtData），同步到共享 state
  // 兼容 cResp 包装（{ success, data, message }）和直接返回对象两种情况
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
