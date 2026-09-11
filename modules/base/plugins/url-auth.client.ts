/**
 * 通过 URL 查询参数自动登录：
 * 打开形如 `https://host/?username=xxx&password=yyy` 的链接时，
 * 若当前未登录，则用该账号自动登录。
 * 登录成功后清除地址栏中的账号密码参数，避免密码残留在 URL/历史记录。
 */
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return

  const route = useRoute()
  const username = route.query.username
  const password = route.query.password
  if (typeof username !== 'string' || typeof password !== 'string') return
  if (!username || !password) return

  const { isLoggedIn, login } = useAuth()
  if (isLoggedIn.value) return

  try {
    await login(username, password)
    // 登录成功后 cookie 已下发到浏览器。首屏为 SSR 渲染（基于无 cookie 的未登录态），
    // 仅靠客户端内存刷新 authData 无法让依赖 SSR 数据的组件重渲染登录态，
    // 因此整页重载到清除参数后的 URL，让 SSR 携带 cookie 直接渲染出登录态，避免手动刷新一次。
    const url = new URL(window.location.href)
    url.searchParams.delete('username')
    url.searchParams.delete('password')
    window.location.replace(url.toString())
  } catch {
    // 登录失败时静默忽略，用户仍可手动登录
  }
})