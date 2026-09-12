/**
 * 界面语言决策插件
 *
 * 优先级（按用户进入后的顺序）：
 *   个人显式设置的语言（users.default_locale，非空） > System Config 站点默认语言
 *   （site:defaultLocale）> 编译期默认 'en'
 *
 * - users.default_locale 为空（null）= 个人未显式设置 → 跟随站点默认语言
 * - system config 改站点默认语言后，未设置个人语言的人随之改变；
 *   已显式设置个人语言的人不受影响（可在个人 profile 中修改）
 * - 全站默认（site:defaultLocale 默认值）为 'en'，故未设置时界面默认英文
 *
 * 仅客户端应用 locale：SSR 仍用编译期默认渲染，避免 hydration mismatch。
 * 同时监听「站点默认语言」与「用户个人语言」变化，即时应用。
 * 站点配置为异步填充，故用 watch（而非启动时只读一次）确保读到最新值。
 */

/** 归一化 locale code：zh-CN/zh/cn/中文 → cn；en-US/en/英文 → en；其他原样返回 */
function normalizeLocale(raw: string): string {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'zh-cn' || v === 'zh' || v === 'cn' || v === '中文') return 'cn'
  if (v === 'en-us' || v === 'en' || v === '英文') return 'en'
  return v
}

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const config = useState<{ [key: string]: any }>('site-config', () => ({}))
  // plugin 非组件 setup 上下文，用 Nuxt 实例访问 i18n（useI18n() 会报 "top of setup"）
  const i18n = (nuxtApp.$i18n as any)
  const currentLocale = computed(() => i18n?.locale?.value)

  // @nuxtjs/i18n v10：请用 Nuxt 实例的 $i18n.setLocale（同步更新翻译并写入 cookie），
  // 直接给 useI18n().locale.value 赋值在部分版本不触发翻译刷新。
  const setLocaleI18n = i18n?.setLocale?.bind(i18n)
    || ((code: string) => { if (i18n?.locale) i18n.locale.value = code })

  const { user } = useAuth()

  function applyLocale() {
    // 个人显式设置的语言（非空）优先；否则跟随站点默认（site:defaultLocale）；再否则回退英文
    const siteCode = normalizeLocale(String(config.value?.defaultLocale || ''))
    const code = normalizeLocale(String(user.value?.defaultLocale || '')) || siteCode || 'en'
    if (currentLocale.value === code) return
    setLocaleI18n(code)
  }

  // 站点默认语言异步填充、用户语言随登录/设置变化 → 监听两者，immediate 覆盖启动初始值，
  // flush:'sync' 让 site-config 填充后立即应用，避免偶发读到空配置而停留在 'en'。
  // plugin 顶层 watch 需挂到 effectScope，避免脱离组件实例告警。
  const scope = effectScope()
  scope.run(() => {
    watch(
      [() => user.value?.defaultLocale, () => config.value?.defaultLocale],
      () => applyLocale(),
      { immediate: true, flush: 'sync' },
    )
  })
})