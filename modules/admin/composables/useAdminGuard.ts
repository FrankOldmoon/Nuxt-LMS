/**
 * Admin backend access guard
 * - adminMiddleware: page-level route middleware, non-admin redirects to home
 * - useAdminGuard: imperative assertion (called in buttons / components)
 */

export const adminMiddleware = defineNuxtRouteMiddleware(() => {
  const { hasRole, isLoggedIn } = useAuth()
  // Both not logged in and non-admin redirect to home
  if (!isLoggedIn.value || !hasRole('admin')) {
    return navigateTo('/')
  }
})

/** Imperatively assert whether the current user is an admin, non-admin shows toast and returns false */
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
