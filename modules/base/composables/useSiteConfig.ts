import { computed } from "vue"

/**
 * useSiteConfig — 公开站点配置（SSR 兼容，单例）
 *
 * 数据来源：/api/config/get
 *   - 由 plugins/site-config.ts 在应用启动时预拉取，结果存于 useState('site-config')
 *   - 客户端通过 Nuxt payload 直接拿到 SSR 数据，不会再发请求
 *
 * 返回字段：siteTitle / siteDescription / siteLogo / siteFavicon /
 *          siteFooterText / defaultLocale / pageSize /
 *          allowRegistration / allowForgotPassword / maintenanceMode /
 *          showNotify / showMsg / showMyFiles
 *
 * 性能：
 * - 整个应用只有 1 个 useState 数据源
 * - 6 个 computed 派生自同一份数据
 * - N 个组件调用 useSiteConfig() 不会产生新的 useFetch / 新的 network 请求
 *
 * 实时更新：WS 广播 'site-config-changed' 触发 refreshNuxtData(key)，
 *   plugins/site-config.ts 里的 watch 自动同步到 useState
 *   - WS handler 用模块级 flag 只注册 1 次（避免重复注册）
 *   - refreshNuxtData 是 Nuxt 内置函数，通过 key 找到 useFetch 实例并触发其 refresh，
 *     不需要保存函数引用（devalue 不能序列化函数）
 */

// 与 plugins/site-config.ts（或 lms 的 plugins/bootstrap.ts）的 useFetch 共用同一个 key
const FETCH_KEY = BOOTSTRAP_KEY

// 模块级 flag：保证 WS handler 在整个应用生命周期内只注册 1 次
let _wsHandlerRegistered = false

export function useSiteConfig() {
  // 单一数据源（与 plugins/site-config.ts 共享同一 key）
  const config = useState<{ [key: string]: any }>('site-config', () => ({}))

  // 派生 computed（从同一份数据计算，无额外网络请求）
  const siteTitle = computed(() => config.value?.siteTitle || 'AI LMS')
  const logo = computed(() => config.value?.siteLogo || '')
  const favicon = computed(() => config.value?.siteFavicon || '/favicon.ico')
  const allowRegistration = computed(() => config.value?.allowRegistration ?? false)
  const showNotify = computed(() => config.value?.showNotify ?? true)
  const showMsg = computed(() => config.value?.showMsg ?? true)
  const showMyFiles = computed(() => config.value?.showMyFiles ?? true)
  // 站点时区（时间显示统一用此固定时区，而不是各浏览器系统时区）；
  // 缺省 Asia/Shanghai（本 LMS 单地区部署，服务器时区即上海）
  const siteTimeZone = computed(() => config.value?.siteTimeZone || 'Asia/Shanghai')

  // 客户端：订阅服务端 site-config-changed 广播，自动 refresh
  // 仅在首次调用时注册 handler（模块级 flag），避免 N 个组件调用 → N 次注册 → N 次 refresh
  if (import.meta.client && !_wsHandlerRegistered) {
    _wsHandlerRegistered = true
    try {
      // 调用 connect() 确保 WS 已建立（ws.vue 也会触发，但组件可能尚未挂载）
      try { useWsConnection().connect() } catch { /* ignore */ }
      // registerWsHandler 通过 addImportsDir 自动导入
      // （modules/base/composables/ws/callbacks.ts）
      registerWsHandler('site-config-changed', () => {
        // 通过 key 找到 plugins/site-config.ts 里的 useFetch 并触发其 refresh
        // refreshNuxtData 是 Nuxt 内置函数，auto-imported
        // refresh 完成后 useFetch 的 data 更新 → watch 同步到 useState
        refreshNuxtData(FETCH_KEY)
      })
    } catch {
      // WS 模块未启用（base stub 模式），静默忽略
    }
  }

  return {
    siteTitle,
    logo,
    favicon,
    allowRegistration,
    showNotify,
    showMsg,
    showMyFiles,
    siteTimeZone,
    // 兼容旧代码：config 字段返回 useState ref
    config: config as any,
    // 手动刷新：调用 refreshNuxtData(key)，watch 自动同步到 useState
    refreshConfig: () => refreshNuxtData(FETCH_KEY),
  }
}
