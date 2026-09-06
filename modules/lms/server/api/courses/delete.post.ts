import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const { course_id, cid, type } = body

  if (!course_id || !cid || !type) {
    return cResp(null, '缺少参数', false)
  }

  // 仅管理员或该课程的教师/编辑者可删除题目类内容
  await requireCourseTeacher(event, Number(course_id))

  const courseId = Number(course_id)
  const itemCid = Number(cid)

  try {
    if (type === 'question') {
      await db.delete(schema.questions).where(and(
        eq(schema.questions.courseId, courseId),
        eq(schema.questions.cid, itemCid)
      ))
    } else if (type === 'homework') {
      await db.delete(schema.homeworks).where(and(
        eq(schema.homeworks.courseId, courseId),
        eq(schema.homeworks.cid, itemCid)
      ))
    } else if (type === 'comment') {
      await db.delete(schema.comments).where(and(
        eq(schema.comments.courseId, courseId),
        eq(schema.comments.cid, itemCid)
      ))
    } else if (type === 'quiz') {
      await db.delete(schema.quizzes).where(and(
        eq(schema.quizzes.courseId, courseId),
        eq(schema.quizzes.cid, itemCid)
      ))
    } else if (type === 'race') {
      await db.delete(schema.races).where(and(
        eq(schema.races.courseId, courseId),
        eq(schema.races.cid, itemCid)
      ))
    } else {
      return cResp(null, '未知类型', false)
    }
    return cResp({ deleted: true })
  } catch (error: any) {
    console.error('删除失败:', error)
    return cResp(null, error.message || '删除失败', false)
  }
})
