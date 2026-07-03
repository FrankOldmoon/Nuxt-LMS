import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

/**
 * 更新 LMS 配置（合并写入数据库，并刷新缓存）
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    return cResp(null, '配置格式无效', false)
  }

  try {
    // 查询现有记录
    const existing = await db.query.configs.findFirst({
      where: eq(schema.configs.id, 'lms_config'),
    })

    // 合并：现有配置 + 新传入的配置
    const currentValue = existing?.value || {}
    const mergedValue = deepMerge(currentValue, body)

    if (existing) {
      // 更新
      await db.update(schema.configs).set({
        value: mergedValue,
      }).where(eq(schema.configs.id, 'lms_config'))
    } else {
      // 新增
      await db.insert(schema.configs).values({
        id: 'lms_config',
        value: mergedValue,
      })
    }

    // 刷新内存缓存
    await reloadLmsConfig()

    return cResp(getLmsConfigSync())
  } catch (error: any) {
    console.error('[lms_config] 更新失败', error)
    return cResp(null, error.statusMessage || '更新失败', false)
  }
})

function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null &&
      typeof target[key] === 'object' && !Array.isArray(target[key]) && target[key] !== null
    ) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}
