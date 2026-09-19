// DELETE /api/mmo/instances/[id] —— 教师/管理员删除本班的一个副本
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])
  const id = getRouterParam(event, 'id')
  if (!id) return cResp(null, '缺少副本 id', false)

  const rows = await db
    .select({ defaultClass: schema.users.defaultClass, classId: schema.users.classId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)
  const dc = rows[0]?.defaultClass
  const classId = (dc && Number((dc as any).id)) || rows[0]?.classId || 0

  await db
    .delete(schema.mmoInstance)
    .where(and(eq(schema.mmoInstance.id, id), eq(schema.mmoInstance.classId, classId)))

  return cResp({ ok: true })
})
