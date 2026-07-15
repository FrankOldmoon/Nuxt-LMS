/**
 * LMS flattened key prefix (corresponds to site:) + legacy data migration
 */
import { db, schema } from '@nuxthub/db'
import { eq, like } from 'drizzle-orm'

export const LMS_KEY_PREFIX = 'lms:'
/** Legacy: id of the legacy single-row json storage (will be deleted after migration) */
export const LEGACY_LMS_CONFIG_ID = 'lms_config'

/**
 * Flatten a tree object into { 'lms:section.key': value } form, for upsert
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
 * Migrate legacy single-row json to flattened rows (only once)
 * - Detection: a row with id='lms_config' exists in the configs table
 * - Action: flatten its value into lms:* rows, then delete the original row
 * - Silent: skip if lms:* rows already exist (to avoid overwriting the new format)
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
      console.log('[lms_config] Migrated: legacy lms_config was empty, deleted')
      return
    }

    for (const { key, value } of pairs) {
      await db.insert(schema.configs)
        .values({ id: key, value })
        .onConflictDoUpdate({ target: schema.configs.id, set: { value } })
    }
    await db.delete(schema.configs).where(eq(schema.configs.id, LEGACY_LMS_CONFIG_ID))
    console.log(`[lms_config] Migrated: ${pairs.length} lms:* flattened keys (from legacy lms_config)`)
  } catch (e) {
    console.error('[lms_config] Legacy data migration failed', e)
  }
}
