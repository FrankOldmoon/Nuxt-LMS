import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { cResp } from '../../utils/index'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event)

  // 仅管理员可更新系统配置
  if (!authUser.roles.includes('admin')) {
    return cResp(null, '无权限', false)
  }

  const body = await readBody(event)
  const { id, value } = body

  if (!id) {
    return cResp(null, '缺少配置 id', false)
  }

  // 使用 onConflictDoUpdate 实现 upsert（插入或更新）
  await db.insert(schema.configs)
    .values({ id, value })
    .onConflictDoUpdate({
      target: schema.configs.id,
      set: { value },
    })

  return cResp(null, '配置更新成功')
})
