import { db, schema } from "@nuxthub/db"

import { buildLmsConfigPairs } from '../../utils/lmsConfig/migration'
import { reloadLmsConfig, getLmsConfigSync } from '../../utils/lmsConfig/cache'

/**
 * 更新 LMS 配置（拍平写入 lms:* 行，并刷新缓存）
 *
 * 路径：POST /api/lms-config/update
 * （原 /api/config/update 路径与 base 模块冲突被覆盖，已迁移到独立路径）
 *
 * body: 树形对象（与原 lmsConfig 树形结构一致，便于前端 settingsModal 复用）
 * 动作：
 *   1. 拍平 body 为 lms:section.key 列表
 *   2. 逐行 upsert 到 configs 表
 *   3. reloadLmsConfig() 刷新内存缓存
 *   4. WS 广播 'lms-config-changed' 通知前端 useAiConfig / useLmsPublicConfig 等自动 refresh
 *
 * 注意：本端点保留树形入参（兼容现有 settingsModal / LmsConfigEditor），
 *       不需要前端适配。如前端已有 lms:* 拍平对象可改用 /api/config/update-batch。
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return cResp(null, '配置格式无效', false)
  }

  try {
    // 1. 拍平为 { 'lms:section.key': value } 列表
    const pairs = buildLmsConfigPairs(body)
    if (!pairs.length) {
      return cResp(getLmsConfigSync())
    }

    // 2. 逐行 upsert
    for (const { key, value } of pairs) {
      await db
        .insert(schema.configs)
        .values({ id: key, value })
        .onConflictDoUpdate({
          target: schema.configs.id,
          set: { value },
        })
    }

    // 3. 刷新内存缓存
    await reloadLmsConfig()

    // 4. WS 广播：所有在线客户端 useAiConfig/useLmsPublicConfig 自动 refresh
    broadcastToAll({ type: 'lms-config-changed' })

    return cResp(getLmsConfigSync())
  } catch (error: any) {
    console.error('[lms_config] 更新失败', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
