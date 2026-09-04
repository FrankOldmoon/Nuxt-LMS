import { db, schema } from "@nuxthub/db"
import { eq, and, inArray } from "drizzle-orm"
import { getUserClassId } from "../../utils/comment/classId"

// 优秀作业列表（全班可见）
// 返回当前用户主班级中，被教师标记为优秀(excellent)的该作业提交，含作答内容/得分/评语/作者信息
export default eventHandler(async (event) => {
  const user = await requireAuth(event)

  const { course_id, homework_cid } = getQuery(event)
  if (!course_id || !homework_cid) {
    return cResp(null, '缺少 course_id 或 homework_cid 参数', false)
  }

  const courseId = Number(course_id)
  const homeworkCid = Number(homework_cid)

  // 当前用户主班级（优秀作业按班级隔离展示）
  const classId = await getUserClassId(user.id)
  if (!classId) return cResp([])

  const classUsers = await getClassUsers(classId)
  const studentIds = classUsers.filter((u: any) => !u.isTeacher).map((u: any) => u.id)
  if (studentIds.length === 0) return cResp([])

  const rows = await db.query.userHomeworks.findMany({
    where: and(
      eq(schema.userHomeworks.homeworkCid, homeworkCid),
      eq(schema.userHomeworks.courseId, courseId),
      eq(schema.userHomeworks.excellent, true),
      inArray(schema.userHomeworks.userId, studentIds),
    ),
  })

  // 作者信息
  const authorIds = [...new Set(rows.map((r: any) => r.userId))]
  const users = authorIds.length
    ? await db.query.users.findMany({ where: inArray(schema.users.id, authorIds) })
    : []
  const userMap = new Map(users.map((u: any) => [u.id, u]))

  return cResp(rows.map((r: any) => {
    const u = userMap.get(r.userId)
    return {
      ...r,
      userName: u?.name || u?.preferName || '',
      preferName: u?.preferName || null,
      avatarImg: u?.avatarImg || null,
    }
  }))
})