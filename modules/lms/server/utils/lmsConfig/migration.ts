/**
 * LMS 拍平键前缀（与 site: 对应）+ 旧版数据迁移
 */
import { db, schema } from '@nuxthub/db'
import { eq, like } from 'drizzle-orm'

export const LMS_KEY_PREFIX = 'lms:'
/** 历史遗留：旧版单行 json 存储的 id（迁移完成后将删除） */
export const LEGACY_LMS_CONFIG_ID = 'lms_config'

/**
 * 将树形对象拍平为 { 'lms:section.key': value } 形式，供 upsert
 */
export function buildLmsConfigPairs(obj: any): Array<{ key: string; value: any }> {
  const flat: Record<string, any> = {}
  const flatten = (prefix: string, val: any) => {
    if (val === null || val === undefined) return
    if (typeof val !== 'object' || Array.isArray(val) || val instanceof Date) {
      if (prefix) flat[prefix] = val
      return
    }
    for (const [k, v] of Object.entries(val)) {
      const fk = prefix ? `${prefix}.${k}` : k
      if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        flatten(fk, v)
      } else if (v !== undefined) flat[fk] = v
    }
  }
  flatten('', obj)
  return Object.entries(flat).map(([k, v]) => ({ key: `${LMS_KEY_PREFIX}${k}`, value: v }))
}

/**
 * 旧版单行 json 迁移到拍平行（仅一次）
 * - 检测：configs 表中 id='lms_config' 行存在
 * - 动作：拍平其 value 为 lms:* 行后删除原行
 * - 静默：若 lms:* 行已存在也跳过（避免覆盖新格式）
 */
export async function migrateLegacyLmsConfigIfNeeded() {
  try {
    const sample = await db.select({ id: schema.configs.id })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
      .limit(1)
    if (sample.length > 0) return

    const legacy = await db.query.configs.findFirst({
      where: eq(schema.configs.id, LEGACY_LMS_CONFIG_ID),
    })
    if (!legacy?.value || typeof legacy.value !== 'object') return

    const pairs = buildLmsConfigPairs(legacy.value)
    if (!pairs.length) {
      await db.delete(schema.configs).where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
      console.log('[lms_config] 已迁移：旧 lms_config 为空，已删除')
      return
    }

    for (const { key, value } of pairs) {
      await db.insert(schema.configs)
        .values({ id: key, value })
        .onConflictDoUpdate({ target: schema.configs.id, set: { value } })
    }
    await db.delete(schema.configs).where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
    console.log(`[lms_config] 已迁移：${pairs.length} 个 lms:* 拍平键（来自旧 lms_config）`)
  } catch (e) {
    console.error('[lms_config] 旧版数据迁移失败', e)
  }
}
