/**
 * Check whether original identity needs to be restored on client initialization
 * After impersonating a student identity, refreshing the page will automatically call /api/auth/restore to restore
 */
export default defineNuxtPlugin(async () => {
  if (import.meta.client) {
    // Check localStorage flag (set during impersonate)
    const isImpersonating = localStorage.getItem('impersonating')
    if (isImpersonating === 'true') {
      try {
        await cRequest('/api/auth/restore', { method: 'POST' })
        localStorage.removeItem('impersonating')
        // Refresh page to restore the original identity UI
        window.location.reload()
      } catch {
        // Silently ignore
      }
    }
  }
})
