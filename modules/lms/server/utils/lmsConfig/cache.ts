/**
 * LMS 配置 - 内存缓存 + 公共 API
 *
 * 拆分后子模块：
 * - ./state：私有 _lmsConfig / _loaded / FLAT_DEFAULTS
 * - ./env-override：AI_* env 变量覆盖
 * - ./course-merge：课程级 lms_config 合并
 */
import { db, schema } from '@nuxthub/db'
import { like } from 'drizzle-orm'
import { unflattenTree } from './tree'
import { LMS_KEY_PREFIX, migrateLegacyLmsConfigIfNeeded } from './migration'
import { FLAT_DEFAULTS, getRaw, getLmsRawConfig, setLoaded, resetCache } from './cache/state'
import { applyEnvOverride } from './cache/env-override'

/**
 * 重新从数据库加载 LMS 配置并更新缓存
 * 1. 读 configs 表所有 lms:* 行（拍平存储）
 * 2. 首次加载时若发现旧版单行 json (id='lms_config')，自动迁移为 lms:* 拍平行
 * 3. 合并 FLAT_DEFAULTS + DB 值 → unflatten 为树 → 写入 _lmsConfig
 * 4. 应用 env 变量覆盖（AI_API_KEY / AI_API_URL / AI_MODEL）
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
    console.error('[lms_config] 加载失败，使用默认配置', e)
    flat = { ...FLAT_DEFAULTS }
  }
  const cfg = unflattenTree(flat)
  applyEnvOverride(cfg)
  setLoaded(cfg)
  return cfg
}

/** 异步获取 LMS 配置（未加载则先加载） */
export async function getLmsConfig(): Promise<any> {
  if (getRaw()) return getRaw()
  return reloadLmsConfig()
}

/** 同步获取已缓存的 LMS 配置（未加载时返回默认值） */
export function getLmsConfigSync(): any { return getLmsRawConfig() }

/** 强制重置缓存（测试用） */
export function _resetLmsConfigCache() { resetCache() }
