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

  // 1. 获取当前用户的 defaultClass
  const userRow = await db.select({ defaultClass: schema.users.defaultClass })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1)

  const classId = userRow[0]?.defaultClass?.id
  if (!classId) {
    return cResp([])
  }

  // 2. 获取该班级所有学生
  const classUsers = await getClassUsers(classId)
  const students = classUsers.filter(u => !u.isTeacher)

  if (students.length === 0) {
    return cResp([])
  }

  // 3. 查询这些学生的作业提交记录
  const records = await db.query.userHomeworks.findMany({
    where: and(
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.homeworkCid, homeworkCid),
    ),
  })

  // 4. 组合：学生信息 + 提交记录
  const recordMap = new Map(records.map(r => [r.userId, r]))
  const result = students.map(s => ({
    id: s.id,
    name: s.name,
    preferName: s.preferName,
    rollNumber: s.rollNumber,
    avatarImg: s.avatarImg,
    record: recordMap.get(s.id) || null,
  }))

  // 返回所有学生，有记录的排前面
  return cResp(result.sort((a, b) => {
    const aHas = a.record !== null ? 1 : 0
    const bHas = b.record !== null ? 1 : 0
    return bHas - aHas
  }))
})
