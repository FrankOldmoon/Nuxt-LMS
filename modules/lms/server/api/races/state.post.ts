import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * Update class race state (classRaces table)
 * body: class_id, course_id, race_cid, current_index, last_question_started_at
 * Teacher: controls question progress (currentIndex)
 */
export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { class_id, course_id, race_cid } = body

  if (!class_id || !course_id || !race_cid) {
    return cResp(null, 'Missing parameters', false)
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
    console.error('Failed to update race state:', error)
    return cResp(null, error.message || 'Update failed', false)
  }
})
