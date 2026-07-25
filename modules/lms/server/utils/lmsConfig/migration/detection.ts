/**
 * LMS 拍平键存在性检测（轻量级，供插件 / 迁移检查使用）
 */
import { db, schema } from '@nuxthub/db'
import { eq, like } from 'drizzle-orm'
import { LMS_KEY_PREFIX, LEGACY_LMS_CONFIG_ID } from '../migration'

/** 检测：当前是否存在 lms:* 拍平行 */
export async function hasLmsFlatRows(): Promise<boolean> {
  try {
    const rows = await db.select({ id: schema.configs.id })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
      .limit(1)
    return rows.length > 0
  } catch { return false }
}

/** 检测：当前是否仍存在旧版 lms_config 单行（迁移未完成） */
export async function hasLegacyLmsConfig(): Promise<boolean> {
  try {
    const rows = await db.select({ id: schema.configs.id })
      .from(schema.configs)
      .where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
      .limit(1)
    return rows.length > 0
  } catch { return false }
}
