import { db, schema } from "@nuxthub/db"
import { eq, and } from "drizzle-orm"

export default eventHandler(async (event) => {
  // 登录可选：未登录按普通用户对待，仅能看到已过审（published）评论
  let user: any = null
  try { user = await requireAuth(event) } catch { user = null }

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  // 审核可见性：老师/管理员可见全部，普通用户仅可见已过审（published）评论
  const isStaff = user?.roles?.some((r) => ['teacher', 'admin'].includes(r))

  const data = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, Number(course_id)),
      eq(schema.comments.cid, Number(cid)),
      ...(isStaff ? [] : [eq(schema.comments.status, 'published')]),
    )
  })

  return cResp(data)
})
