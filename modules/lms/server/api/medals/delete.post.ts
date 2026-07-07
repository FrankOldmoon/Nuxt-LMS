import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 删除奖章（仅管理员），同时级联删除 userMedals */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, '无权限：仅管理员可操作', false)
  }

  const body = await readBody(event)
  const { id } = body
  if (!id) return cResp(null, '缺少 id 参数', false)

  await db.delete(schema.medals).where(eq(schema.medals.id, Number(id)))
  return cResp({ success: true })
})
