/**
 * 作品点赞 / 取消点赞
 * POST /api/showcase/like
 * body: { showcase_id, like: boolean }
 *
 * 用 showcase_likes 表的唯一(userId, showcaseId)记录点赞状态；
 * 同时维护 showcases.like_count 计数器（乐观 +1/-1）
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)
  const showcaseId = Number(body.showcase_id)
  const like = body.like === true
  if (!showcaseId) return cResp(null, '缺少 showcase_id', false)

  const work = await db.query.showcases.findFirst({ where: eq(schema.showcases.id, showcaseId) })
  if (!work || work.deletedAt) return cResp(null, '作品不存在', false)

  const existing = await db.query.showcaseLikes.findFirst({
    where: and(
      eq(schema.showcaseLikes.userId, user.id),
      eq(schema.showcaseLikes.showcaseId, showcaseId),
    ),
  })

  const wasLiked = !!existing?.like
  if (existing) {
    await db.update(schema.showcaseLikes).set({ like }).where(and(
      eq(schema.showcaseLikes.userId, user.id),
      eq(schema.showcaseLikes.showcaseId, showcaseId),
    ))
  } else {
    await db.insert(schema.showcaseLikes).values({ userId: user.id, showcaseId, like })
  }

  // 计数器同步
  if (like !== wasLiked) {
    const delta = like ? 1 : -1
    await db.update(schema.showcases).set({
      likeCount: (existing ? Number(work.likeCount || 0) : Number(work.likeCount || 0)) + delta,
    }).where(eq(schema.showcases.id, showcaseId))
  }

  return cResp({ liked: like })
})