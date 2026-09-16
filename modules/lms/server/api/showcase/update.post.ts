/**
 * 更新作品（仅管理员）。编辑后回到待审 pending
 * POST /api/showcase/update
 * body: { id, title?, category?, cover?, content?, tags?, userIds? }
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'
import { normalizeShowcaseUserIds, setShowcaseMembers } from '../../utils/db/showcaseMembers'

export default eventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = Number(body.id)
  if (!id) return cResp(null, '缺少 id', false)

  const work = await db.query.showcases.findFirst({ where: and(eq(schema.showcases.id, id), isNull(schema.showcases.deletedAt)) })
  if (!work) return cResp(null, '作品不存在', false)

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

  // 参与用户为多对多：传入即整体替换
  const userIds = body.userIds !== undefined ? normalizeShowcaseUserIds(body.userIds) : null
  if (userIds) await setShowcaseMembers(id, userIds)

  return cResp({ id, status: 'pending', userIds })
})
