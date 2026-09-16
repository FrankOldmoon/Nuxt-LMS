/**
 * 删除作品（软删除，仅管理员）
 * POST /api/showcase/delete
 * body: { id }
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, '缺少 id', false)

  const work = await db.query.showcases.findFirst({ where: and(eq(schema.showcases.id, id), isNull(schema.showcases.deletedAt)) })
  if (!work) return cResp(null, '作品不存在', false)

  await db.update(schema.showcases).set({ deletedAt: new Date() }).where(eq(schema.showcases.id, id))
  return cResp({ deleted: true })
})
