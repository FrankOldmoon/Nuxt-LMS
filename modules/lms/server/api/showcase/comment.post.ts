/**
 * 发表作品评论（同学间互动，立即发布）
 * POST /api/showcase/comment
 * body: { showcase_id, content, parent_id? }
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

function isEmpty(content: any): boolean {
  if (!content) return true
  if (typeof content === 'string') return content.trim().length === 0
  let text = ''
  const collect = (n: any): void => {
    if (!n) return
    if (typeof n === 'string') { text += n; return }
    if (Array.isArray(n)) { n.forEach(collect); return }
    if (typeof n === 'object') {
      if (typeof n.text === 'string') text += n.text
      if (Array.isArray(n.content)) n.content.forEach(collect)
    }
  }
  collect(content)
  return text.trim().length === 0
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const showcaseId = Number(body.showcase_id)
  if (!showcaseId) return cResp(null, '缺少 showcase_id', false)
  if (isEmpty(body.content)) return cResp(null, '评论内容不能为空', false)

  const work = await db.query.showcases.findFirst({ where: eq(schema.showcases.id, showcaseId) })
  if (!work || work.deletedAt) return cResp(null, '作品不存在', false)

  const [row] = await db.insert(schema.showcaseComments).values({
    showcaseId,
    userId: user.id,
    parentId: body.parent_id ? Number(body.parent_id) : null,
    content: body.content,
    status: 'published',
  }).returning()

  const author = await db.query.users.findFirst({ where: eq(schema.users.id, user.id) })
  return cResp({ ...row, userName: author?.name || '', avatarImg: author?.avatarImg || null, children: [] })
})