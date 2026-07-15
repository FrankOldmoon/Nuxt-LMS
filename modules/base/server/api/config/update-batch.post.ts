import { reloadConfig } from '../../utils/config/reload'
import { broadcastToAll } from '../../utils/ws/state'

/**
 * Admin: batch update site:* config keys (for settingsModal save)
 * body: { items: [{ key, value }] }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const items: { key: string; value: any }[] = body?.items || []
  if (!Array.isArray(items) || !items.length) {
    return cResp(null, 'items cannot be empty', false)
  }
  for (const { key, value } of items) {
    if (key && typeof key === 'string' && key.startsWith('site:')) {
      await upsertConfig(key, value)
    }
  }
  await reloadConfig()
  // Notify all online clients: site config has changed, useSiteConfig will auto refresh
  broadcastToAll({ type: 'site-config-changed' })
  return cResp(null, 'Saved successfully')
})
