/**
 * 客户端路由守卫：仅守卫 /dashboard、/report、/broadcasts 前缀路径
 * 非管理员（含未登录）访问时跳回首页，不影响普通用户访问其他页面。
 */
export default defineNuxtPlugin(() => {
  addRouteMiddleware(
    (to) => {
      if (
        to.path.startsWith('/dashboard')
        || to.path.startsWith('/report')
        || to.path.startsWith('/broadcasts')
      ) {
        const { isLoggedIn, hasRole } = useAuth()
        if (!isLoggedIn.value || !hasRole('admin')) {
          return navigateTo('/')
        }
      }
    },
    { global: true },
  )
})
