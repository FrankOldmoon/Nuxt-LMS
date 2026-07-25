import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 更新班级竞赛状态（classRaces 表）
 * body: class_id, course_id, race_cid, current_index, last_question_started_at
 * 教师：控制题目进度（currentIndex）
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { class_id, course_id, race_cid } = body

  if (!class_id || !course_id || !race_cid) {
    return cResp(null, '缺少参数', false)
  }

  const classId = Number(class_id)
  const courseId = Number(course_id)
  const raceCid = Number(race_cid)

  const updateData: any = {}
  if (body.current_index !== undefined) updateData.currentIndex = Number(body.current_index)
  if (body.last_question_started_at !== undefined) {
    updateData.lastQuestionStartedAt = body.last_question_started_at || null
  }

  try {
    const existing = await db.query.classRaces.findFirst({
      where: and(
        eq(schema.classRaces.classId, classId),
        eq(schema.classRaces.courseId, courseId),
        eq(schema.classRaces.raceCid, raceCid)
      )
    })

    if (existing) {
      await db.update(schema.classRaces).set(updateData).where(and(
        eq(schema.classRaces.classId, classId),
        eq(schema.classRaces.courseId, courseId),
        eq(schema.classRaces.raceCid, raceCid)
      ))
    } else {
      await db.insert(schema.classRaces).values({
        classId,
        courseId,
        raceCid,
        currentIndex: updateData.currentIndex ?? 0,
        lastQuestionStartedAt: updateData.lastQuestionStartedAt ?? null,
      })
    }

    return cResp({ ...existing, ...updateData })
  } catch (error: any) {
    console.error('更新竞赛状态失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
