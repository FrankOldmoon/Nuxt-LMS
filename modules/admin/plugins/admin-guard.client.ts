/**
 * Client route guard: only guards /dashboard prefix paths
 * Non-admin (including not logged in) accessing /dashboard* redirects to home, does not affect normal users accessing other pages.
 */
export default defineNuxtPlugin(() => {
  addRouteMiddleware(
    (to) => {
      if (to.path.startsWith('/dashboard')) {
        const { isLoggedIn, hasRole } = useAuth()
        if (!isLoggedIn.value || !hasRole('admin')) {
          return navigateTo('/')
        }
      }
    },
    { global: true },
  )
})
