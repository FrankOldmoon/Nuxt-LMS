/**
 * LMS flat-key existence detection (lightweight, for plugin / migration check)
 */
import { db, schema } from '@nuxthub/db'
import { eq, like } from 'drizzle-orm'
import { LMS_KEY_PREFIX, LEGACY_LMS_CONFIG_ID } from '../migration'

/** Check: whether lms:* flat rows currently exist */
export async function hasLmsFlatRows(): Promise<boolean> {
  try {
    const rows = await db.select({ id: schema.configs.id })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
      .limit(1)
    return rows.length > 0
  } catch { return false }
}

/** Check: whether the legacy lms_config single row still exists (migration incomplete) */
export async function hasLegacyLmsConfig(): Promise<boolean> {
  try {
    const rows = await db.select({ id: schema.configs.id })
      .from(schema.configs)
      .where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
      .limit(1)
    return rows.length > 0
  } catch { return false }
}
