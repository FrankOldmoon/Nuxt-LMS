/**
 * 首屏引导数据单例插件（合并原 plugins/site-config.ts 之外的两个 lms 插件：
 * lms-public-config.ts + home-data.ts）
 *
 * 应用启动时（SSR + 客户端首次加载）**只发一次** /api/bootstrap，把三份数据
 * 分别写入各自的 useState，所有组件通过以下 composable 共享同一份数据：
 * - useSiteConfig()       → useState('site-config')
 * - useLmsPublicConfig()  → useState('lms-public-config')
 * - useHome()             → useState('home-data')
 *
 * 对比改造前：SSR 首屏此前要顺序等待 3 个异步插件各自的请求
 * （/api/config/get → /api/config/lms-public → /api/home），现在只等 1 个。
 *
 * 刷新机制：WS 广播（site-config-changed / lms-config-changed / home-changed）
 * 统一触发 refreshNuxtData(BOOTSTRAP_KEY)，data 变化后由下面的 watch 同步到 useState。
 *
 * 注：仅 base 运行时（lms 未启用）由 plugins/site-config.ts 负责拉取，本插件不注册。
 */
export default defineNuxtPlugin(async () => {
  // 初始化共享 state（与各 composable 共用同一 key）
  const siteConfig = useState<{ [key: string]: any }>('site-config', () => ({}))
  const lmsConfig = useState<{ [key: string]: any }>('lms-public-config', () => ({}))
  const homeData = useState<any>('home-data', () => ({
    categories: [],
    courses: [],
    config: null,
  }))

  // 首次拉取：SSR 阻塞首屏等待这一次请求，客户端用 payload（不产生额外请求）
  const { data } = await useFetch<any>('/api/bootstrap', {
    key: BOOTSTRAP_KEY,
  })

  // 监听 data 变化（initial + 每次 refreshNuxtData），同步到三个共享 state
  watch(
    data,
    (raw) => {
      const payload = raw?.data ?? raw
      if (!payload || typeof payload !== 'object') return
      if (payload.siteConfig && typeof payload.siteConfig === 'object') {
        siteConfig.value = payload.siteConfig
      }
      if (payload.lmsPublicConfig && typeof payload.lmsPublicConfig === 'object') {
        lmsConfig.value = payload.lmsPublicConfig
      }
      if (payload.home && typeof payload.home === 'object') {
        homeData.value = payload.home
      }
    },
    { immediate: true, deep: true },
  )
})
