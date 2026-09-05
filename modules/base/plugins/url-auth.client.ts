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
    // 清除 URL 中的账号密码参数
    const url = new URL(window.location.href)
    url.searchParams.delete('username')
    url.searchParams.delete('password')
    window.history.replaceState({}, '', url.toString())
  } catch {
    // 登录失败时静默忽略，用户仍可手动登录
  }
})