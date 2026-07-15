/**
 * LMS config - in-memory cache + public API
 *
 * Sub-modules after split:
 * - ./state: private _lmsConfig / _loaded / FLAT_DEFAULTS
 * - ./env-override: AI_* env variable override
 * - ./course-merge: course-level lms_config merge
 */
import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'
import { unflattenTree } from './tree'
import { LMS_KEY_PREFIX, migrateLegacyLmsConfigIfNeeded } from './migration'
import { FLAT_DEFAULTS, getRaw, getLmsRawConfig, setLoaded, resetCache } from './cache/state'
import { applyEnvOverride } from './cache/env-override'

/**
 * Reload LMS config from the database and update the cache
 * 1. Read all lms:* rows from the configs table (flattened storage)
 * 2. On first load, if a legacy single-row json (id='lms_config') is found, automatically migrate it to lms:* flattened rows
 * 3. Merge FLAT_DEFAULTS + DB values -> unflatten into a tree -> write to _lmsConfig
 * 4. Apply env variable overrides (AI_API_KEY / AI_API_URL / AI_MODEL)
 */
export async function reloadLmsConfig(): Promise<any> {
  await migrateLegacyLmsConfigIfNeeded()
  let flat: Record<string, any> = { ...FLAT_DEFAULTS }
  try {
    const rows = await db
      .select({ id: schema.configs.id, value: schema.configs.value })
      .from(schema.configs)
      .where(like(schema.configs.id, `${LMS_KEY_PREFIX}%`))
    for (const row of rows) {
      const key = row.id.startsWith(LMS_KEY_PREFIX) ? row.id.slice(LMS_KEY_PREFIX.length) : row.id
      if (row.value !== undefined && row.value !== null) flat[key] = row.value
    }
  } catch (e) {
    console.error('[lms_config] Load failed, using default config', e)
    flat = { ...FLAT_DEFAULTS }
  }
  const cfg = unflattenTree(flat)
  applyEnvOverride(cfg)
  setLoaded(cfg)
  return cfg
}

/** Async get LMS config (load first if not loaded) */
export async function getLmsConfig(): Promise<any> {
  if (getRaw()) return getRaw()
  return reloadLmsConfig()
}

/** Sync get cached LMS config (returns defaults when not loaded) */
export function getLmsConfigSync(): any { return getLmsRawConfig() }

/** Force reset cache (for testing) */
export function _resetLmsConfigCache() { resetCache() }
