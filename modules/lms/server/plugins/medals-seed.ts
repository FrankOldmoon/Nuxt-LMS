import { db, schema } from '@nuxthub/db'
import { DEFAULT_MEDALS } from '../utils/medals/default-medals'

/**
 * On server startup, check if the medals table is empty; if so, write the default medals
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
    console.log(`[medals] Wrote ${DEFAULT_MEDALS.length} default medals`)
  } catch (e) {
    console.error('[medals] Failed to write default medals:', e)
  }
})
