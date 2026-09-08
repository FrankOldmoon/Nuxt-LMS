/**
 * 删除作品评论（作者本人或管理员/老师）
 * POST /api/showcase/comment/delete
 * body: { id }
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, '缺少 id', false)

  const isStaff = user.roles?.some((r) => ['teacher', 'admin'].includes(r))
  const row = await db.query.showcaseComments.findFirst({ where: eq(schema.showcaseComments.id, id) })
  if (!row || row.deletedAt) return cResp(null, '评论不存在', false)
  if (row.userId !== user.id && !isStaff) return cResp(null, '无权操作', false)

  await db.update(schema.showcaseComments).set({ deletedAt: new Date() }).where(eq(schema.showcaseComments.id, id))
  return cResp({ deleted: true })
})