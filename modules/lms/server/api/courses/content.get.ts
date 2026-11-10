import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireTeacherOrObserver(event)

  const { course_id, type } = getQuery(event)
  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  const courseId = Number(course_id)
  const itemType = String(type || '')

  const result: any[] = []

  if (!itemType || itemType === 'question') {
    const items = await db.query.questions.findMany({
      where: eq(schema.questions.courseId, courseId),
    })
    result.push(...items.map((q: any) => ({
      type: 'question',
      cid: q.cid,
      name: q.name,
      content: q.content,
      tags: q.tags,
      point: q.point,
      extra: { qtype: q.type, options: q.options, answer: q.answer },
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })))
  }

  if (!itemType || itemType === 'homework') {
    const items = await db.query.homeworks.findMany({
      where: eq(schema.homeworks.courseId, courseId),
    })
    result.push(...items.map((h: any) => ({
      type: 'homework',
      cid: h.cid,
      name: h.name,
      content: h.content,
      tags: h.tags,
      point: h.point,
      extra: { code: h.code, explanation: h.explanation },
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    })))
  }

  if (!itemType || itemType === 'comment') {
    const items = await db.query.comments.findMany({
      where: eq(schema.comments.courseId, courseId),
    })
    result.push(...items.map((c: any) => ({
      type: 'comment',
      cid: c.cid,
      name: c.name,
      content: c.content,
      tags: c.tags,
      point: c.point,
      extra: { userId: c.userId, parentId: c.parentId, status: c.status },
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })))
  }

  if (!itemType || itemType === 'quiz') {
    const items = await db.query.quizzes.findMany({
      where: eq(schema.quizzes.courseId, courseId),
    })
    result.push(...items.map((q: any) => ({
      type: 'quiz',
      cid: q.cid,
      name: q.name,
      content: q.content,
      tags: q.tags,
      point: q.point,
      extra: { questions: q.questions, timeLimit: q.timeLimit, submitLimit: q.submitLimit, startAt: q.startAt, endAt: q.endAt },
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    })))
  }

  if (!itemType || itemType === 'race') {
    const items = await db.query.races.findMany({
      where: eq(schema.races.courseId, courseId),
    })
    result.push(...items.map((r: any) => ({
      type: 'race',
      cid: r.cid,
      name: r.name,
      content: r.content,
      tags: r.tags,
      point: r.point,
      extra: { questionIds: r.questionIds, gapTime: r.gapTime },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })))
  }

  // 按 type 再按 cid 排序
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    return a.cid - b.cid
  })

  return cResp(result)
})
