/**
 * 作品详情
 * GET /api/showcase/show?id=
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const id = Number(getQuery(event).id)
  if (!id) return cResp(null, '缺少 id', false)

  let user: any = null
  try { user = await requireAuth(event) } catch { user = null }
  const isStaff = !!user?.roles?.some((r) => ['teacher', 'admin'].includes(r))

  const work = await db.query.showcases.findFirst({ where: and(eq(schema.showcases.id, id), isNull(schema.showcases.deletedAt)) })
  if (!work) return cResp(null, '作品不存在', false)

  const visible = work.status === 'approved' || (user && (work.userId === user.id || isStaff))
  if (!visible) return cResp(null, '无权查看', false)

  // 作者信息
  const author = await db.query.users.findFirst({ where: eq(schema.users.id, work.userId) })

  // 当前用户点赞状态
  let liked = false
  if (user) {
    const like = await db.query.showcaseLikes.findFirst({
      where: and(
        eq(schema.showcaseLikes.userId, user.id),
        eq(schema.showcaseLikes.showcaseId, id),
        eq(schema.showcaseLikes.like, true),
      ),
    })
    liked = !!like
  }

  return cResp({
    ...work,
    userName: author?.name || '',
    avatarImg: author?.avatarImg || null,
    avatarFrame: author?.avatarFrame || null,
    liked,
  })
})