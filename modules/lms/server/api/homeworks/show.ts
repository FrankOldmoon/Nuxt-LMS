import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

/**
 * 作业详情
 * GET /api/homeworks/show?course_id=&cid=
 *
 * explanation（作业解析）仅教师/管理员可见（前端 render 也仅在教师视角展示），
 * 学生视角剥离。
 */
export default eventHandler(async (event) => {
  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 id 参数', false)
  }

  const { homeworks } = schema

  const data = await db.query.homeworks.findFirst({
    where: and(
      eq(homeworks.courseId, Number(course_id)),
      eq(homeworks.cid, Number(cid))
    )
  })
  if (!data) return cResp(null, '作业不存在', false)

  const user = await getCurrentUser(event)
  const canReveal = !!user?.roles?.some((r: string) => r === 'teacher' || r === 'admin')
  if (!canReveal) {
    delete (data as any).explanation
  }

  return cResp(data)
})
