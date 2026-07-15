import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * Admin: update a single site:* config key
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const { key, value } = body || {}
  if (!key || typeof key !== 'string' || !key.startsWith('site:')) {
    return cResp(null, 'Invalid key', false)
  }
  await upsertConfig(key, value)
  await reloadConfig()
  // Notify all online clients: site config has changed, useSiteConfig will auto refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, 'Updated successfully')
})
