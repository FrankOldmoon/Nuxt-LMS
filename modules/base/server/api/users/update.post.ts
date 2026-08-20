import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default eventHandler(async (event) => {
  const caller = await requireAuth(event)
  const isAdmin = caller.roles.includes('admin')

  const table = 'users'
  const body = await readBody(event)
  const { id, ...setData } = body

  if (!id) {
    return cResp(null, '缺少 id 参数', false)
  }

  const targetId = Number(id)

  // 防提权：非 admin 不能更新 teacher/admin 用户
  if (!isAdmin) {
    const targetRoles = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, targetId))
    if (targetRoles.some(r => r.code === 'teacher' || r.code === 'admin')) {
      throw createError({ statusCode: 403, message: '无权限：不能修改教师/管理员账号' })
    }
  }

  try {
    const result = await updateTable(table, targetId, setData)
    return cResp(result)
  } catch (error: any) {
    console.error('更新失败:', error)
    return cResp(null, error.message || '更新失败', false)
  }
})
