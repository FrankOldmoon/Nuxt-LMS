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
 * 监听 user.defaultLocale 变化（登录/切换后即时生效）。
 */

/** 归一化 locale code：zh-CN/zh/cn/中文 → cn；en-US/en/英文 → en；其他原样返回 */
function normalizeLocale(raw: string): string {
  const v = (raw || '').trim().toLowerCase()
  if (!v) return ''
  if (v === 'zh-cn' || v === 'zh' || v === 'cn' || v === '中文') return 'cn'
  if (v === 'en-us' || v === 'en' || v === '英文') return 'en'
  return v
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const config = useState<{ [key: string]: any }>('site-config', () => ({}))
  const siteCode = normalizeLocale(String(config.value?.defaultLocale || ''))

  function applyLocale() {
    const user = useAuth().user?.value
    // 个人显式设置的语言（非空）优先；否则跟随站点默认；再否则回退英文
    const code = normalizeLocale(String(user?.defaultLocale || '')) || siteCode || 'en'
    const i18n = useI18n()
    if (i18n.locale.value === code) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setLocale = (i18n as any).setLocale || ((c: string) => { i18n.locale.value = c })
    setLocale(code)
  }

  applyLocale()

  // 登录 / 用户信息变化（或修改个人语言）后即时应用
  const { user } = useAuth()
  watch(() => user.value?.defaultLocale, () => applyLocale())
})