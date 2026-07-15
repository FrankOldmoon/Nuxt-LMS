import { db, schema } from "@nuxthub/db"

import { buildLmsConfigPairs } from '../../utils/lmsConfig/migration'
import { reloadLmsConfig, getLmsConfigSync } from '../../utils/lmsConfig/cache'

/**
 * Update LMS config (flatten and write lms:* rows, then refresh the cache)
 *
 * Path: POST /api/lms-config/update
 * (The original /api/config/update path conflicted with the base module and was overridden, migrated to an independent path)
 *
 * body: tree object (consistent with the original lmsConfig tree structure, for frontend settingsModal reuse)
 * Actions:
 *   1. Flatten body into a lms:section.key list
 *   2. Upsert each row into the configs table
 *   3. reloadLmsConfig() to refresh the in-memory cache
 *   4. WS broadcast 'lms-config-changed' to notify the frontend useAiConfig / useLmsPublicConfig etc. to auto refresh
 *
 * Note: This endpoint keeps the tree input (compatible with existing settingsModal / LmsConfigEditor),
 *       no frontend adaptation needed. If the frontend already has a flattened lms:* object, use /api/config/update-batch instead.
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return cResp(null, 'Invalid config format', false)
  }

  try {
    // 1. Flatten into { 'lms:section.key': value } list
    const pairs = buildLmsConfigPairs(body)
    if (!pairs.length) {
      return cResp(getLmsConfigSync())
    }

    // 2. Upsert each row
    for (const { key, value } of pairs) {
      await db
        .insert(schema.configs)
        .values({ id: key, value })
        .onConflictDoUpdate({
          target: schema.configs.id,
          set: { value },
        })
    }

    // 3. Refresh the in-memory cache
    await reloadLmsConfig()

    // 4. WS broadcast: all online clients useAiConfig/useLmsPublicConfig auto refresh
    broadcastToAll({ type: 'lms-config-changed' })

    return cResp(getLmsConfigSync())
  } catch (error: any) {
    console.error('[lms_config] Update failed', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
