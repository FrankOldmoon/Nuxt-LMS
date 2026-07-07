/**
 * useLmsConfig — 网站配置组合式函数（SSR 兼容）
 *
 * 功能：
 * - 获取网站配置（站点标题、Logo 等）
 * - 支持 SSR，服务端渲染时即获取配置
 * - 数据自动序列化到页面 payload，客户端 hydration 时直接还原
 * - 多组件共享同一份 useAsyncData 缓存
 * - 支持手动刷新配置（配置更新后调用 refreshConfig）
 */

export function useLmsConfig() {
  // 获取当前语言（用于国际化标题）
  const { locale } = useI18n()

  // 使用 useFetch 实现 SSR 兼容
  // 服务端请求时会自动转发 cookie，客户端会从 payload 还原数据
  const { data: homeData, status, refresh } = useFetch('/api/home', {
    // 服务端也请求（SSR），确保首屏就有配置数据
    server: true,
    // 懒加载关闭，setup 阶段即发起请求
    lazy: false,
    // 指定唯一 key，确保多组件共享缓存
    key: 'lms-home-config',
    // 解析 { data, success, msg } 包裹格式，只提取 config 字段
    transform: (raw: any) => {
      if (raw && raw.success && raw.data) {
        return raw.data.config ?? null
      }
      return null
    },
    // 默认值
    default: () => null,
  })

  // ====================== 派生状态 ======================

  const config = computed(() => homeData.value)

  // 站点标题（支持国际化，如果配置中是对象则根据当前语言选择）
  const siteTitle = computed(() => {
    const title = config.value?.siteTitle
    if (!title) return 'AI LMS'
    // 如果 title 是对象（如 { zh: '...', en: '...' }），根据当前语言选择
    if (typeof title === 'object' && title !== null) {
      return title[locale.value] ?? title['en'] ?? 'AI LMS'
    }
    return title
  })

  // 站点 Logo
  const logo = computed(() => config.value?.logo ?? null)

  // 加载状态
  const isLoading = computed(() => status.value === 'pending')

  // 刷新配置（配置更新后调用此方法）
  async function refreshConfig() {
    await refresh()
  }

  return {
    config,
    siteTitle,
    logo,
    isLoading,
    refreshConfig,
  }
}
