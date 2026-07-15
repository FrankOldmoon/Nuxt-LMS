import { db, schema } from "@nuxthub/db"
import { eq, and, inArray, sql } from "drizzle-orm"


/**
 * Persist the current user's heading task completion status for a chapter
 * body: { chapter_id, task_status: { [headingId]: boolean }, is_pass: boolean }
 *
 * The client is responsible for calculating the completion status of each heading (hover reading for 3s + interactive component all answered correctly),
 * and only upsert persistence is done here; is_pass is calculated by the client based on the completion of all headings.
 *
 * When a heading changes from incomplete to completed, reward chapter.headingExp exp + chapter.headingCoin coin +
 * chapter.headingScore course score (counted into userCourses.marksScore, participates in total score calculation).
 * When is_pass changes from false to true, trigger medal check.
 *
 * When is_pass status changes, also update user_courses.records.progress
 * (pass ratio of all chapters in the course = number of passed chapters / total chapters in the course).
 */
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const body = await readBody(event)
  const chapterId = Number(body.chapter_id)
  if (!chapterId) {
    return cResp(null, 'Missing chapter_id parameter', false)
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

    // Find newly completed headings (old status not true -> new status true)
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

    // Load courseId (needed for both heading rewards and is_pass logic)
    const chapter = await db
      .select({ courseId: schema.chapters.courseId })
      .from(schema.chapters)
      .where(eq(schema.chapters.id, chapterId))
      .limit(1)
    const courseId = chapter[0]?.courseId || 0

    // Heading completion reward: grant headingExp + headingCoin + headingScore for each newly completed heading
    if (courseId && newHeadingIds.length > 0) {
      const config = await getCourseLmsConfig(courseId)
      const headingExp = Number(config?.chapter?.headingExp) || 0
      const headingCoin = Number(config?.chapter?.headingCoin) || 0
      const headingScore = Number(config?.chapter?.headingScore) || 0
      if (headingExp > 0 || headingCoin > 0 || headingScore > 0) {
        gainedExp = headingExp * newHeadingIds.length
        gainedCoin = headingCoin * newHeadingIds.length
        const scoreDelta = headingScore * newHeadingIds.length
        await addCourseScore(user.id, courseId, scoreDelta, 'marksScore', gainedExp, gainedCoin)
      }
    }

    // When chapter pass status changes, update the course pass ratio and check medals
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
    // drizzle's DrizzleQueryError hides the real PG error in error.cause
    const pgError = error?.cause?.message || error?.message || 'Failed to save'
    console.error('Failed to save chapter task status:', pgError, error?.cause || error)
    return cResp(null, pgError, false)
  }
})

/**
 * Update the user's chapter pass ratio for a course, stored in user_courses.records.progress
 * progress = number of passed chapters / total chapters in the course x 100 (percentage, 0~100)
 */
async function updateCourseProgress(userId: number, courseId: number) {
  // All chapter ids under the course
  const courseChapters = await db
    .select({ id: schema.chapters.id })
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, courseId))
  const total = courseChapters.length
  if (total === 0) return
  const chapterIds = courseChapters.map(c => c.id)

  // Number of chapters the user has passed
  const passed = await db
    .select({ chapterId: schema.userChapters.chapterId })
    .from(schema.userChapters)
    .where(and(
      eq(schema.userChapters.userId, userId),
      eq(schema.userChapters.isPass, true),
      inArray(schema.userChapters.chapterId, chapterIds),
    ))
  const progress = Math.round((passed.length / total) * 100)

  // upsert to user_courses.records.progress (jsonb merge, does not overwrite other keys)
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
