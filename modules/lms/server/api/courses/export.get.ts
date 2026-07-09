/**
 * 课程导出：打包课程及其全部内容（章节、题目、作业、评论、测验、竞赛）
 * GET /api/courses/export?id=1
 *
 * 鉴权：管理员或目标课程的任课教师/编辑者
 *
 * 输出 JSON 结构：
 * {
 *   version: 1,
 *   exportedAt: ISO 时间戳,
 *   course: { name, code, categoryId, content, orders, gradeCriteria, tags, config },
 *   chapters: [{ id, name, code, content, tags, questionIds, homeworkIds, commentIds, quizIds, objectives, tasks, isOpen }],
 *   questions: [...],
 *   homeworks: [...],
 *   comments: [...],
 *   quizzes: [...],
 *   races: [...]
 * }
 *
 * 配合 import API 使用：先导后导，ID 会被重新映射。
 */
import { db, schema } from '@nuxthub/db'
import { eq, and, inArray, asc } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const id = requireQueryId(event)
  if (!id) return cResp(null, '课程 ID 无效', false)

  await requireCourseTeacher(event, id)

  // 1. 课程本体
  const course = await db.query.courses.findFirst({
    where: eq(schema.courses.id, id),
  })
  if (!course) return cResp(null, '课程不存在', false)

  // 2. 全部章节
  const chapterRows = await db
    .select()
    .from(schema.chapters)
    .where(eq(schema.chapters.courseId, id))
    .orderBy(asc(schema.chapters.id))

  // 3. 收集章节里引用到的所有 cid（去重）
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

  // 4. 拉取所有引用到的内容（按 courseId + cid 复合主键）
  const [questions, homeworks, comments, quizzes, races] = await Promise.all([
    fetchByCids(schema.questions, id, Array.from(questionIds)),
    fetchByCids(schema.homeworks, id, Array.from(homeworkIds)),
    fetchByCids(schema.comments, id, Array.from(commentIds)),
    fetchByCids(schema.quizzes, id, Array.from(quizIds)),
    db.select().from(schema.races).where(eq(schema.races.courseId, id)),
  ])

  // 5. 整理输出（去除元数据列 createdAt/updatedAt 之外的内部字段如有）
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

/** 收集数字 id 集合（容忍 JSON 字段中混入非数字或空值） */
function collectIds(raw: any, set: Set<number>) {
  if (!Array.isArray(raw)) return
  for (const v of raw) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) set.add(n)
  }
}

/**
 * 按 courseId + cid 集合拉取（复合主键表）
 */
function fetchByCids(table: any, courseId: number, cids: number[]) {
  if (!cids.length) return Promise.resolve([])
  return db.select().from(table).where(
    and(eq(table.courseId, courseId), inArray(table.cid, cids)),
  )
}
