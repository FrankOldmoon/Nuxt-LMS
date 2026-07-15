import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * Admin: reload config from database into in-memory cache (replaces original /api/reload-site)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await reloadConfig()
  // Notify all online clients: site config has changed, useSiteConfig will auto refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, 'Reloaded')
})
