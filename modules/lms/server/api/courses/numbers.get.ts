import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireTeacherOrObserver(event)

  const { course_id } = getQuery(event)
  if (!course_id) {
    return cResp(null, '缺少 course_id 参数', false)
  }

  const data = await db.query.userCourses.findMany({
    where: eq(schema.userCourses.courseId, Number(course_id)),
  })

  // 返回 { userId: number } 映射
  const map = {}
  for (const uc of data) {
    map[uc.userId] = uc.number || ''
  }
  return cResp(map)
})
