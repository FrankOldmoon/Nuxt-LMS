/**
 * 获取当前登录用户在本课程的总分、经验值，以及指定章节的得分
 * GET /api/lms/courses/me?courseId=1[&chapterId=2]
 *
 * 轻量接口，专供 userCard 等需要实时刷新积分/经验的位置使用：
 * - 无需 classId，直接按 userId + courseId 查 userCourses
 * - 提供 chapterId 时顺带返回该章节的分数（userChapters）
 * - 不查任务完成情况，便于答题/交作业后高频调用
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, isNull, sql } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const chapterId = Number(query.chapterId) || 0

  // 未读通知数（始终返回，与课程无关）
  const [notifyRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.notifys)
    .where(and(eq(schema.notifys.userId, user.id), isNull(schema.notifys.readAt)))

  // 未读消息数（始终返回，与课程无关）
  const [msgRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(schema.messages)
    .where(and(
      eq(schema.messages.receiverUserId, user.id),
      isNull(schema.messages.readAt),
      isNull(schema.messages.deletedAt),
    ))

  const unread = {
    notifyUnread: Number(notifyRow?.count) || 0,
    msgUnread: Number(msgRow?.count) || 0,
  }

  if (!courseId) {
    return cResp({ courseScore: 0, exp: 0, chapterScore: null, ...unread })
  }

  // 课程总分 + 经验值
  const courseRows = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
    })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.userId, user.id),
      eq(schema.userCourses.courseId, courseId),
    ))
    .limit(1)

  const courseRow = courseRows[0]

  // 章节分数（仅在指定 chapterId 时返回）
  let chapterScore: number | null = null
  if (chapterId) {
    // 校验章节确实属于该课程，防止越权读取其他课程的章节分数
    const chapter = await db
      .select({ id: schema.chapters.id })
      .from(schema.chapters)
      .where(and(
        eq(schema.chapters.id, chapterId),
        eq(schema.chapters.courseId, courseId),
      ))
      .limit(1)
    if (chapter[0]) {
      const chapterRows = await db
        .select({ score: schema.userChapters.score })
        .from(schema.userChapters)
        .where(and(
          eq(schema.userChapters.userId, user.id),
          eq(schema.userChapters.chapterId, chapterId),
        ))
        .limit(1)
      chapterScore = chapterRows[0] ? Number(chapterRows[0].score) || 0 : 0
    }
  }

  return cResp({
    courseScore: courseRow ? Number(courseRow.score) || 0 : 0,
    exp: courseRow ? Number(courseRow.exp) || 0 : 0,
    chapterScore,
    ...unread,
  })
})
