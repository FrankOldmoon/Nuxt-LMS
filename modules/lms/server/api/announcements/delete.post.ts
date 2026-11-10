/**
 * 删除公告
 * POST /api/announcements/delete
 * body: { id: number }
 *
 * 权限：课程教师 / 管理员
 */
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const user = await requireAuth(event)
  const { id } = await readBody(event)
  const annId = Number(id)
  if (!annId) return cResp(null, '缺少 id', false)

  const ann = await db.query.announcements.findFirst({
    where: eq(schema.announcements.id, annId),
  })
  if (!ann) return cResp(null, '公告不存在', false)

  // 权限：管理员 / 系统教师 / 本课程教师（含编辑者）
  // 用 isCourseStaff（严格）：observer 只读，不能删公告（即使同时挂了 teacher 角色）
  const allowed = !user.roles.includes('observer') && (
    user.roles.includes('admin')
    || user.roles.includes('teacher')
    || (await isCourseStaff(user.id, ann.courseId))
  )
  if (!allowed) {
    return cResp(null, '仅教师及以上可删除公告', false)
  }

  await db.delete(schema.announcements).where(eq(schema.announcements.id, annId))
  return cResp({ deleted: 1 })
})
