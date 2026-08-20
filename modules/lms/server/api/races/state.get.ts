import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 获取班级竞赛状态（classRaces 表）
 * query: class_id, course_id, race_cid
 */
export default eventHandler(async (event) => {
  await requireAuth(event)

  const { class_id, course_id, race_cid } = getQuery(event)
  if (!class_id || !course_id || !race_cid) {
    return cResp(null, '缺少参数', false)
  }

  const state = await db.query.classRaces.findFirst({
    where: and(
      eq(schema.classRaces.classId, Number(class_id)),
      eq(schema.classRaces.courseId, Number(course_id)),
      eq(schema.classRaces.raceCid, Number(race_cid))
    )
  })

  return cResp(state)
})
