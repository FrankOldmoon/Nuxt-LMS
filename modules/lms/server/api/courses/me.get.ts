/**
 * 获取当前登录用户在本课程的总分、经验值、已获奖章，以及指定章节的得分与任务进度
 * GET /api/courses/me?courseId=1[&chapterId=2]
 *
 * 轻量接口，专供 userCard 等需要实时刷新积分/经验的位置使用：
 * - 无需 classId，直接按 userId + courseId 查 userCourses
 * - 提供 chapterId 时顺带返回该章节的分数 + taskStatus（章节进度）
 * - 附带已获奖章（medals），替代 /api/medals/my 在章节页的高频调用
 * - 奖章授予检查（/api/medals/check）不在此处执行（避免每次拉积分重跑聚合）
 */
import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const query = getQuery(event)
  const courseId = Number(query.courseId)
  const chapterId = Number(query.chapterId) || 0

  if (!courseId) {
    return cResp({ courseScore: 0, exp: 0, coin: 0, chapterScore: null, medals: [], chapterTaskStatus: null, chapterIsPass: false })
  }

  // 课程总分 + 经验值
  const courseRows = await db
    .select({
      score: schema.userCourses.score,
      exp: schema.userCourses.exp,
      coin: schema.userCourses.coin,
    })
    .from(schema.userCourses)
    .where(and(
      eq(schema.userCourses.userId, user.id),
      eq(schema.userCourses.courseId, courseId),
    ))
    .limit(1)

  const courseRow = courseRows[0]

  // 章节分数 + 任务进度（仅在指定 chapterId 时返回）
  let chapterScore: number | null = null
  let chapterTaskStatus: Record<string, boolean> | null = null
  let chapterIsPass = false
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
        .select({
          score: schema.userChapters.score,
          taskStatus: schema.userChapters.taskStatus,
          isPass: schema.userChapters.isPass,
        })
        .from(schema.userChapters)
        .where(and(
          eq(schema.userChapters.userId, user.id),
          eq(schema.userChapters.chapterId, chapterId),
        ))
        .limit(1)
      const chRow = chapterRows[0]
      chapterScore = chRow ? Number(chRow.score) || 0 : 0
      chapterTaskStatus = (chRow?.taskStatus && typeof chRow.taskStatus === 'object')
        ? chRow.taskStatus as Record<string, boolean>
        : {}
      chapterIsPass = !!chRow?.isPass
    }
  }

  // 已获奖章（与 /api/medals/my 同构，省去章节页独立请求）
  const medalRows = await db
    .select({
      medalId: schema.userMedals.medalId,
      name: schema.medals.name,
      content: schema.medals.content,
      createdAt: schema.userMedals.createdAt,
    })
    .from(schema.userMedals)
    .innerJoin(schema.medals, eq(schema.userMedals.medalId, schema.medals.id))
    .where(eq(schema.userMedals.userId, user.id))
    .limit(200)

  return cResp({
    courseScore: courseRow ? Number(courseRow.score) || 0 : 0,
    exp: courseRow ? Number(courseRow.exp) || 0 : 0,
    coin: courseRow ? Number(courseRow.coin) || 0 : 0,
    chapterScore,
    medals: medalRows,
    chapterTaskStatus,
    chapterIsPass,
  })
})
