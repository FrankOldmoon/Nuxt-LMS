import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'

/**
 * 管理员：返回所有 site:* 配置键值（供 settingsModal 加载）
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const rows = await db
    .select({ key: schema.configs.id, value: schema.configs.value })
    .from(schema.configs)
    .where(like(schema.configs.id, 'site:%'))
  return cResp(rows)
})
