import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  // 仅教师/管理员可查看用户详情
  const caller = await requireTeacherOrObserver(event)
  const isAdmin = caller.roles.includes('admin')

  const table = 'users'
  const id = Number(getQuery(event).id)
  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }
  const data = await showTable(table, id)
  if (!data) return cResp(null, '用户不存在', false)

  // 隐私保护：非 admin（教师）不能查看 teacher/admin 账号的详细资料
  if (!isAdmin) {
    const targetRoles = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, id))
    if (targetRoles.some(r => r.code === 'teacher' || r.code === 'admin')) {
      throw createError({ statusCode: 403, message: '无权限：不能查看教师/管理员账号资料' })
    }
  }

  // 剥离敏感字段，不泄露密码哈希
  if (data && typeof data === 'object') {
    delete (data as Record<string, any>).password
  }
  return cResp(data)
})
