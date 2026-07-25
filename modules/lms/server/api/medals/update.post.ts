import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/** 更新奖章（仅管理员） */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!user.roles.includes('admin')) {
    return cResp(null, '无权限：仅管理员可操作', false)
  }

  const body = await readBody(event)
  const { id, name, content } = body
  if (!id) return cResp(null, '缺少 id 参数', false)

  const updateData: any = {}
  if (name !== undefined) updateData.name = name
  if (content !== undefined) updateData.content = content

  const result = await db.update(schema.medals)
    .set(updateData)
    .where(eq(schema.medals.id, Number(id)))
    .returning()

  return cResp(result[0])
})
