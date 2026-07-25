import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  const user = await requireRole(event, ['teacher', 'admin'])

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  const courseId = Number(course_id)
  const homeworkCid = Number(cid)

  // 1. 获取当前用户的 defaultClass，确定查询范围
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = (userRow[0]?.defaultClass as any)?.id
  if (!classId) {
    return cResp([])
  }

  // 2. 获取该班级学生 userIds（仅用于确定查询范围）
  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter(u => !u.isTeacher).map(u => u.id)

  if (studentIds.length === 0) {
    return cResp([])
  }

  // 3. 查询这些学生的作业提交记录，只返回 userId + record
  const records = await db.query.userHomeworks.findMany({
    where: and(
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, homeworkCid),
    ),
  })

  // 4. 只返回有记录的 { userId, record } 列表
  const recordMap = new Map(records.map(r => [r.userId, r]))
  const result = studentIds
    .filter(id => recordMap.has(id))
    .map(id => ({
      userId: id,
      record: recordMap.get(id),
    }))

  return cResp(result)
})
