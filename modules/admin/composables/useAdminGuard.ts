/**
 * 后台管理访问守卫
 * - adminMiddleware：页面级路由中间件，非 admin 跳回首页
 * - useAdminGuard：命令式断言（按钮 / 组件内调用）
 */

export const adminMiddleware = defineNuxtRouteMiddleware(() => {
  const { hasRole, isLoggedIn } = useAuth()
  // 未登录或非管理员均跳回首页
  if (!isLoggedIn.value || !hasRole('admin')) {
    return navigateTo('/')
  }
})

/** 命令式断言当前用户是否为管理员，非管理员弹提示并返回 false */
export function useAdminGuard() {
  const { hasRole } = useAuth()
  const toast = useToast()

  function assertAdmin(): boolean {
    if (!hasRole('admin')) {
      toast.add({
        title: useI18n().t('admin.guard.noPermission') as string,
        color: 'error',
      })
      return false
    }
    return true
  }

  return { isAdmin: computed(() => hasRole('admin')), assertAdmin }
}
