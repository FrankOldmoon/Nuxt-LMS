/**
 * 管理员/老师审批作品
 * POST /api/showcase/approve
 * body: { id, status: 'approved' | 'rejected' }
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])
  const user = await requireAuth(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, '缺少 id', false)
  const status = body.status === 'rejected' ? 'rejected' : 'approved'

  const work = await db.query.showcases.findFirst({ where: eq(schema.showcases.id, id) })
  if (!work || work.deletedAt) return cResp(null, '作品不存在', false)

  await db.update(schema.showcases).set({
    status,
    approvedBy: user.id,
    approvedAt: new Date(),
  }).where(eq(schema.showcases.id, id))

  return cResp({ id, status })
})