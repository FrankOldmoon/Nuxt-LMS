/**
 * 创建作品（仅管理员）。提交即待审 pending，过审后公开展示
 * POST /api/showcase
 * body: { title, category?, cover?, content?, tags?, userIds? }
 */
import { db, schema } from '@nuxthub/db'
import { normalizeShowcaseUserIds, setShowcaseMembers } from '../../utils/db/showcaseMembers'

export default eventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readBody(event)
  const title = String(body.title || '').trim()
  if (!title) return cResp(null, '缺少标题', false)

  const category = body.category === 'hardware' ? 'hardware' : 'software'
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((x: any) => typeof x === 'string' && x.trim()).map((x: any) => x.trim()).slice(0, 10)
    : []
  const userIds = normalizeShowcaseUserIds(body.userIds)

  const [row] = await db.insert(schema.showcases).values({
    userId: user.id,
    title,
    category,
    cover: body.cover ? String(body.cover) : null,
    content: body.content ?? null,
    tags,
    status: 'pending',
  }).returning()

  await setShowcaseMembers(row.id, userIds)

  return cResp({ id: row.id, status: row.status, userIds })
})
