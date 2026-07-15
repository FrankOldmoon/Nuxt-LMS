/**
 * Course export: package a course and all its content (chapters, questions, homeworks, comments, quizzes, races)
 * GET /api/courses/export?id=1
 *
 * Auth: admin or any teacher/editor of the target course
 *
 * Output JSON structure:
 * {
 *   version: 1,
 *   exportedAt: ISO timestamp,
 *   course: { name, code, categoryId, content, orders, gradeCriteria, tags, config },
 *   chapters: [{ id, name, code, content, tags, questionIds, homeworkIds, commentIds, quizIds, objectives, tasks, isOpen }],
 *   questions: [...],
 *   homeworks: [...],
 *   comments: [...],
 *   quizzes: [...],
 *   races: [...]
 * }
 *
 * Used with the import API: export then import; IDs will be remapped.
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, asc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) return cResp(null, 'Invalid course ID', false)

  await requireCourseTeacher(event, id)

  // 1. The course itself
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
  })
  if (!course) return cResp(null, 'Course not found', false)

  // 2. All chapters
  const chapterRows = await db
    .select()
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, id))
    .orderBy(asc(schema.chapters.id))

  // 3. Collect all cids referenced in chapters (deduped)
  const questionIds = new Set<number>()
  const homeworkIds = new Set<number>()
  const commentIds = new Set<number>()
  const quizIds = new Set<number>()

  for (const ch of chapterRows) {
    collectIds(ch.questionIds, questionIds)
    collectIds(ch.homeworkIds, homeworkIds)
    collectIds(ch.commentIds, commentIds)
    collectIds(ch.quizIds, quizIds)
  }

  // 4. Fetch all referenced content (by courseId + cid composite primary key)
  const [questions, homeworks, comments, quizzes, races] = await Promise.all([
    fetchByCids(schema.questions, id, Array.from(questionIds)),
    fetchByCids(schema.homeworks, id, Array.from(homeworkIds)),
    fetchByCids(schema.comments, id, Array.from(commentIds)),
    fetchByCids(schema.quizzes, id, Array.from(quizIds)),
    db.select().from(schema.races).where(eq(schema.races.courseId, id)),
  ])

  // 5. Build output (strip internal fields beyond metadata like createdAt/updatedAt if any)
  return cResp({
    version: 1,
    exportedAt: new Date().toISOString(),
    course: {
      name: course.name,
      code: course.code,
      categoryId: course.categoryId,
      content: course.content,
      orders: course.orders,
      gradeCriteria: course.gradeCriteria,
      tags: course.tags,
      config: course.config,
    },
    chapters: chapterRows.map((ch) => ({
      id: ch.id,
      name: ch.name,
      code: ch.code,
      content: ch.content,
      tags: ch.tags,
      questionIds: ch.questionIds,
      homeworkIds: ch.homeworkIds,
      commentIds: ch.commentIds,
      quizIds: ch.quizIds,
      objectives: ch.objectives,
      tasks: ch.tasks,
      isOpen: ch.isOpen,
    })),
    questions,
    homeworks,
    comments,
    quizzes,
    races,
  })
})

/** Collect numeric id set (tolerate non-numeric or empty values mixed in JSON fields) */
function collectIds(raw: any, set: Set<number>) {
  if (!Array.isArray(raw)) return
  for (const v of raw) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) set.add(n)
  }
}

/**
 * Fetch by courseId + cid set (composite primary key table)
 */
function fetchByCids(table: any, courseId: number, cids: number[]) {
  if (!cids.length) return Promise.resolve([])
  return db.select().from(table).where(
    and(eq(table.courseId, courseId), inArray(table.cid, cids)),
  )
}
