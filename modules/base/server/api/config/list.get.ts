import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'

/**
 * Admin: return all site:* config key-values (for settingsModal loading)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await db
    .select({ key: schema.configs.id, value: schema.configs.value })
    .from(schema.configs)
    .where(like(schema.configs.id, 'site:%'))
  return cResp(rows)
})
