import { db, schema } from "@nuxthub/db"
import { eq, and, inArray, sql } from "drizzle-orm"
import { listProgressHeadingIds } from '../../../utils/progressHeading'


/**
 * 持久化当前用户在某章节的 heading 任务完成状态
 * body: { chapter_id, task_status: { [headingId]: boolean }, is_pass: boolean }
 *
 * 安全策略（防客户端伪造）：
 *  - task_status 的 key 必须是章节内容中真实存在的 heading id（含合成的章节标题 id，
 *    且与前端 progressHeadingId 同口径：顶层 + 带 id + 标题文本非空），未知的 key 一律丢弃
 *  - is_pass 由服务端根据「全部合法 heading 是否完成」重算，不信任客户端
 *
 * 当某个 heading 从未完成变为完成时，奖励 chapter.headingExp 经验 + chapter.headingCoin 金币 +
 * chapter.headingScore 课程分（计入 userCourses.attitudeScore，参与总分计算）。
 * 当 is_pass 从 false 变为 true 时，触发奖章检查。
 *
 * 当 is_pass 状态发生变化时，同步更新 user_courses.records.progress
 * （整个课程所有章节的通过比 = 已通过章节数 / 课程总章节数）。
 */

/** 合法 heading id 集合：合成章节标题 + 顶层且标题文本非空的 heading（与前端同口径） */
function extractHeadingIds(content: any, chapterId: number): Set<string> {
  return new Set<string>([String(chapterId), ...listProgressHeadingIds(content)])
}

export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, '缺少 chapter_id 参数', false)
  }

  let newMedals: number[] = []
  let gainedExp = 0
  let gainedCoin = 0
  let gainedScore = 0

  try {
    const existing = await db.query.userChapters.findFirst({
      where: and(eq(schema.userChapters.userId, user.id), eq(schema.userChapters.chapterId, chapterId)),
    })

    const wasPass = !!existing?.isPass
    const oldTaskStatus = (existing?.taskStatus && typeof existing.taskStatus === 'object')
      ? existing.taskStatus as Record<string, boolean>
      : {}

    // 加载章节（courseId + content 用于校验 heading 合法性）
    const chapterRows = await db
      .select({ courseId: schema.chapters.courseId, content: schema.chapters.content })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, chapterId))
      .limit(1)
    const courseId = chapterRows[0]?.courseId || 0
    if (!courseId) {
      return cResp(null, '章节不存在', false)
    }

    // 只保留章节内容中真实存在的 heading id，值强制为 boolean
    const validIds = extractHeadingIds(chapterRows[0]?.content, chapterId)
    const rawStatus = (body.task_status && typeof body.task_status === 'object')
      ? body.task_status as Record<string, any>
      : {}
    const taskStatus: Record<string, boolean> = {}
    for (const [key, val] of Object.entries(oldTaskStatus)) {
      if (validIds.has(key)) taskStatus[key] = !!val
    }
    for (const [key, val] of Object.entries(rawStatus)) {
      if (!validIds.has(key)) continue
      // sticky：已完成的 heading 不允许被客户端回退（true→false→true 反复 toggle
      // 会重复触发 heading 奖励发放），故已完成的一律保持 true
      taskStatus[key] = taskStatus[key] === true ? true : val === true
    }

    // 服务端重算 is_pass：全部合法 heading 完成
    const isPass = validIds.size > 0 && [...validIds].every(id => taskStatus[id] === true)

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

    // heading 完成奖励：每个新完成的 heading 发放 headingExp + headingCoin + headingScore + headingChapterScore
    if (courseId && newHeadingIds.length > 0) {
      const config = await getCourseLmsConfig(courseId)
      const headingExp = Number(config?.chapter?.headingExp) || 0
      const headingCoin = Number(config?.chapter?.headingCoin) || 0
      const headingScore = Number(config?.chapter?.headingScore) || 0
      const headingChapterScore = Number(config?.chapter?.headingChapterScore) || 0
      if (headingExp > 0 || headingCoin > 0 || headingScore > 0 || headingChapterScore > 0) {
        gainedExp = headingExp * newHeadingIds.length
        gainedCoin = headingCoin * newHeadingIds.length
        const scoreDelta = headingScore * newHeadingIds.length
        gainedScore = scoreDelta
        await addCourseScore(user.id, courseId, scoreDelta, 'attitudeScore', gainedExp, gainedCoin)
        // 章节标题完成同时计入章节分（可调参数 chapter.headingChapterScore）
        if (headingChapterScore > 0) {
          await addChapterScore(user.id, chapterId, headingChapterScore * newHeadingIds.length)
        }
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

    return cResp({ isPass, newMedals, gainedExp, gainedCoin, gainedScore })
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
