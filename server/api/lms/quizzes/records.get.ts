import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 获取 quiz 的所有学生提交记录
 * query: course_id, cid
 */
export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少参数', false)
  }

  const courseId = Number(course_id)
  const quizCid = Number(cid)

  // 获取教师默认班级
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp([])
  }

  // 获取班级学生
  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)

  if (studentIds.length === 0) {
    return cResp([])
  }

  // 查询 quiz 提交记录
  const records = await db.query.userQuizzes.findMany({
    where: and(
      eq(schema.userQuizzes.courseId, courseId),
      eq(schema.userQuizzes.quizCid, quizCid),
    ),
  })

  const recordMap = new Map(records.map(r => [r.userId, r]))
  const result = studentIds
    .filter(id => recordMap.has(id))
    .map(id => ({
      userId: id,
      record: recordMap.get(id),
    }))

  return cResp(result)
})
