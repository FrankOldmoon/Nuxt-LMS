import { db, schema } from "@nuxthub/db"
import { eq, and, inArray, sql } from "drizzle-orm"


/**
 * 持久化当前用户在某章节的 heading 任务完成状态
 * body: { chapter_id, task_status: { [headingId]: boolean }, is_pass: boolean }
 *
 * 客户端负责计算每个 heading 的完成状态（hover 阅读停留 3s + 互动组件提交全部答对），
 * 这里仅做 upsert 持久化；is_pass 由客户端根据全部 heading 完成情况计算。
 *
 * 当某个 heading 从未完成变为完成时，奖励 chapter.headingExp 经验 + chapter.headingCoin 金币。
 * 当 is_pass 从 false 变为 true 时，触发奖章检查。
 *
 * 当 is_pass 状态发生变化时，同步更新 user_courses.records.progress
 * （整个课程所有章节的通过比 = 已通过章节数 / 课程总章节数）。
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, '缺少 chapter_id 参数', false)
  }

  const taskStatus = (body.task_status && typeof body.task_status === 'object')
    ? body.task_status
    : {}
  const isPass = !!body.is_pass
  let newMedals: number[] = []
  let gainedExp = 0
  let gainedCoin = 0

  try {
    const existing = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)),
    })

    const wasPass = !!existing?.isPass
    const oldTaskStatus = (existing?.taskStatus && typeof existing.taskStatus === 'object')
      ? existing.taskStatus as Record<string, boolean>
      : {}

    // 找出新完成的 heading（旧状态非 true → 新状态 true）
    const newHeadingIds = Object.keys(taskStatus).filter(
      (key) => taskStatus[key] === true && !oldTaskStatus[key],
    )

    if (existing) {
      await db.update(schema.userChapters).set({
        taskStatus,
        isPass,
      }).where(and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)))
    } else {
      await db.insert(schema.userChapters).values({
        userId: user.id,
        chapterId,
        taskStatus,
        isPass,
      })
    }

    // 加载 courseId（heading 奖励和 is_pass 逻辑都需要）
    const chapter = await db
      .select({ courseId: schema.chapters.courseId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, chapterId))
      .limit(1)
    const courseId = chapter[0]?.courseId || 0

    // heading 完成奖励：每个新完成的 heading 发放 headingExp + headingCoin
    if (courseId && newHeadingIds.length > 0) {
      const config = await getCourseLmsConfig(courseId)
      const headingExp = config?.chapter?.headingExp || 0
      const headingCoin = config?.chapter?.headingCoin || 0
      if (headingExp > 0 || headingCoin > 0) {
        gainedExp = headingExp * newHeadingIds.length
        gainedCoin = headingCoin * newHeadingIds.length
        await addCourseScore(user.id, courseId, 0, 'marksScore', gainedExp, gainedCoin)
      }
    }

    // 章节通过状态变化时，更新课程通过比并检查奖章
    if (isPass !== wasPass && courseId) {
      const tasks: Promise<unknown>[] = [
        updateCourseProgress(user.id, courseId),
      ]
      if (isPass && !wasPass) {
        tasks.push(checkAndAwardMedals(user.id, courseId).then(m => { newMedals = m }))
      }
      await Promise.all(tasks)
    }

    return cResp({ isPass, newMedals, gainedExp, gainedCoin })
  } catch (error: any) {
    // drizzle 的 DrizzleQueryError 把真正的 PG 错误藏在 error.cause 里
    const pgError = error?.cause?.message || error?.message || '保存失败'
    console.error('保存章节任务状态失败:', pgError, error?.cause || error)
    return cResp(null, pgError, false)
  }
})

/**
 * 更新用户在某课程的章节通过比，存入 user_courses.records.progress
 * progress = 已通过章节数 / 课程总章节数 × 100（百分比，0~100）
 */
async function updateCourseProgress(userId: number, courseId: number) {
  // 课程下所有章节 id
  const courseChapters = await db
    .select({ id: schema.chapters.id })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))
  const total = courseChapters.length
  if (total === 0) return
  const chapterIds = courseChapters.map(c => c.id)

  // 用户已通过的章节数
  const passed = await db
    .select({ chapterId: schema.userChapters.chapterId })
    .from(schema.userChapters)
    .where(and(
      eq(schema.userChapters.userId, userId),
      eq(schema.userChapters.isPass, true),
      inArray(schema.userChapters.chapterId, chapterIds),
    ))
  const progress = Math.round((passed.length / total) * 100)

  // upsert 到 user_courses.records.progress（jsonb 合并，不覆盖其它 key）
  await db.insert(schema.userCourses)
    .values({
      userId,
      courseId,
      records: { progress },
    })
    .onConflictDoUpdate({
      target: [schema.userCourses.userId, schema.userCourses.courseId],
      set: {
        records: sql`COALESCE(${schema.userCourses.records}, '{}'::jsonb) || jsonb_build_object('progress', ${progress}::int)`,
      },
    })
}
