/**
 * Refresh the site_config in-memory cache
 * Called by the admin after saving the mail configuration in settingsModal
 * so the new configuration takes effect immediately
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await reloadSiteConfig()
  return cResp(null, 'site_config refreshed')
})
