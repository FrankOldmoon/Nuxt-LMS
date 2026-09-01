/**
 * useLmsPublicConfig — 公开 LMS 配置组合式函数（SSR 兼容，单例）
 *
 * 数据来源：/api/config/lms-public
 *   - 返回 home / courseList / chapterPage / course / chapterBtns / courseBtns / user
 *     / ai 公开字段
 *   - 排除敏感 ai.llmApiKey / ai.llmApiUrl
 *
 * 单例机制（与 useSiteConfig 一致）：
 *   - plugins/lms-public-config.ts 在应用启动时调用 useFetch 拉取一次
 *   - 数据存入 useState('lms-public-config')，所有组件共享同一份
 *   - 客户端 hydration 直接从 payload 还原，不发新请求
 *
 * 实时更新：
 *   - WS 广播 'lms-config-changed' 触发 refreshNuxtData('lms-public-config-singleton-fetch')
 *   - useState 自动同步 → 所有 computed 自动更新
 *
 * 使用：
 *   const { home, courseList, chapterPage, course, chapterBtns, courseBtns,
 *           user, ai, refresh } = useLmsPublicConfig()
 *   v-if="home.showHero"
 *   v-if="chapterPage.showOutline"
 */

// 模块级 flag：WS handler 在整个应用生命周期内只注册 1 次
let _wsHandlerRegistered = false

export function useLmsPublicConfig() {
  // 单一数据源（与 plugins/lms-public-config.ts 共享同一 key）
  const config = useState<{ [key: string]: any }>('lms-public-config', () => ({}))

  // 各分组的派生 computed（默认值兜底，未加载时给安全默认）
  const home = computed(() => config.value?.home || { showHero: true, showStats: true, showRecentCourses: true, showLeaderboard: true })
  const courseList = computed(() => config.value?.courseList || { showSearch: true, showFilter: true, showSort: true, defaultView: 'grid' })
  const chapterPage = computed(() => config.value?.chapterPage || { showOutline: true, showNote: true, showDanmakuPanel: true, enableFullscreen: true })
  const course = computed(() => config.value?.course || {})
  const chapterBtns = computed(() => config.value?.chapterBtns || {})
  const courseBtns = computed(() => config.value?.courseBtns || {})
  const user = computed(() => config.value?.user || {})
  const ai = computed(() => config.value?.ai || {})
  const oj = computed(() => config.value?.oj || { url: 'http://10.28.1.155' })
  // 等级换算步长：每 levelStep 经验升一级的曲线系数（默认 100，前端等级换算用）
  const levelStep = computed(() => Number(config.value?.general?.levelStep) || 100)

  // 客户端：订阅服务端 lms-config-changed 广播，自动 refresh
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      // 确保 WS 已建立
      try { useWsConnection().connect() } catch { /* ignore */ }
      registerWsHandler('lms-config-changed', () => {
        // 通过 key 找到 plugins/lms-public-config.ts 里的 useFetch 并触发其 refresh
        // refresh 完成后 useFetch 的 data 更新 → plugin watch 同步到 useState
        refreshNuxtData('lms-public-config-singleton-fetch')
      })
    } catch {
      // WS 模块未启用（base stub 模式），静默忽略
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
    oj,
    levelStep,
    // 手动刷新（与 useSiteConfig 一致：通过 key 触发 useFetch refresh）
    refresh: () => refreshNuxtData('lms-public-config-singleton-fetch'),
  }
}
