import { db, schema } from "@nuxthub/db"
import { eq, and, or, isNull } from "drizzle-orm"

export default eventHandler(async (event) => {
  // 登录可选：未登录按普通用户对待，仅能看到已过审（published）评论
  let user: any = null
  try { user = await requireAuth(event) } catch { user = null }

  const { course_id, cid } = getQuery(event)
  if (!course_id || !cid) {
    return cResp(null, '缺少 course_id 或 cid 参数', false)
  }

  // 审核可见性：
  // - 老师/管理员：可见全部
  // - 已登录普通用户：可见「已过审的」+「自己发的」（自己发的评论无论是否过审都要能看到）
  // - 未登录：仅可见已过审的
  const isStaff = user?.roles?.some((r) => ['teacher', 'admin'].includes(r))
  const visibleWhere = isStaff
    ? []
    : user
      ? [or(eq(schema.comments.status, 'published'), eq(schema.comments.userId, user.id))]
      : [eq(schema.comments.status, 'published')]

  const data = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.courseId, Number(course_id)),
      eq(schema.comments.cid, Number(cid)),
      // 软删除（batch delete 写入 deletedAt）的评论不再返回
      isNull(schema.comments.deletedAt),
      ...visibleWhere,
    )
  })

  return cResp(data)
})
