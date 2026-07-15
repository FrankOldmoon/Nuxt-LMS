import { db, schema } from "@nuxthub/db"
import { eq, desc } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const { course_id, content } = body

  if (!course_id) {
    return cResp(null, 'Missing course_id parameter', false)
  }

  try {
    // Query the maximum cid in this course
    const maxCidResult = await db.select({ cid: schema.comments.cid })
      .from(schema.comments)
      .where(eq(schema.comments.courseId, course_id))
      .orderBy(desc(schema.comments.cid))
      .limit(1)

    const newCid = (maxCidResult[0]?.cid ?? 0) + 1

    const insertData = {
      courseId: course_id,
      cid: newCid,
      name: body.name || '',
      content: content || '',
      userId: user.id,
      parentId: body.parentId || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      point: body.point ?? 1,
      status: body.status || 'published',
    }

    const result = await db.insert(schema.comments).values(insertData).returning()

    // Check and award medals
    await checkAndAwardMedals(user.id, course_id)

    // Calculate expected exp for this submission (top-level comment -> publishExp; reply -> replyExp)
    // Used for submitBroadcast.onlyOnReward filter
    let commentGainedExp: number | undefined
    try {
      const cfg = await getCourseLmsConfig(course_id)
      const cConfig = cfg?.comment
      if (cConfig) {
        commentGainedExp = insertData.parentId
          ? Number(cConfig.replyExp) || 0
          : Number(cConfig.publishExp) || 0
      }
    } catch { /* Do not block submission when config is unavailable */ }

    // Broadcast danmaku to the class room (fire-and-forget, does not affect response)
    void broadcastSubmitDanmaku({
      userId: user.id,
      kind: 'comment',
      gainedExp: commentGainedExp,
    })

    return cResp(result[0])
  } catch (error: any) {
    console.error('Failed to add comment:', error)
    return cResp(null, error.message || 'Failed to add', false)
  }
})
