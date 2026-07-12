import { db, schema } from '@nuxthub/db'
import { DEFAULT_MEDALS } from '../utils/medals/default-medals'

/**
 * 服务启动时检查 medals 表是否为空，若空则写入默认奖章
 */
export default defineNitroPlugin(async () => {
  try {
    const existing = await db.select().from(schema.medals)
    if (existing.length > 0) return

    for (const medal of DEFAULT_MEDALS) {
      await db.insert(schema.medals).values({
        name: medal.name,
        content: medal.content,
      })
    }
    console.log(`[medals] 已写入 ${DEFAULT_MEDALS.length} 个默认奖章`)
  } catch (e) {
    console.error('[medals] 写入默认奖章失败:', e)
  }
})
