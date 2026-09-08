/**
 * 更新作品（作者本人或管理员）。编辑后回到待审 pending
 * POST /api/showcase/update
 * body: { id, title?, category?, cover?, content?, tags? }
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, '缺少 id', false)

  const isStaff = user.roles?.some((r) => ['teacher', 'admin'].includes(r))
  const work = await db.query.showcases.findFirst({ where: and(eq(schema.showcases.id, id), isNull(schema.showcases.deletedAt)) })
  if (!work) return cResp(null, '作品不存在', false)
  if (work.userId !== user.id && !isStaff) return cResp(null, '无权操作', false)

  const set: any = {}
  if (body.title !== undefined) set.title = String(body.title || '').trim()
  if (body.category !== undefined) set.category = body.category === 'hardware' ? 'hardware' : 'software'
  if (body.cover !== undefined) set.cover = body.cover ? String(body.cover) : null
  if (body.content !== undefined) set.content = body.content ?? null
  if (body.tags !== undefined) {
    set.tags = Array.isArray(body.tags)
      ? body.tags.filter((x: any) => typeof x === 'string' && x.trim()).map((x: any) => x.trim()).slice(0, 10)
      : []
  }
  // 编辑后回到待审，需重新过审
  set.status = 'pending'
  if (!set.title) return cResp(null, '标题不能为空', false)

  await db.update(schema.showcases).set(set).where(eq(schema.showcases.id, id))
  return cResp({ id, status: 'pending' })
})