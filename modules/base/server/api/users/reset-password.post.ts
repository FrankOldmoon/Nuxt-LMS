import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"

export default eventHandler(async (event) => {
  const caller = await requireAuth(event)
  const isAdmin = caller.roles.includes('admin')

  const body = await readBody(event)
  const { user_id, password } = body

  if (!user_id || !password) {
    return cResp(null, '缺少 user_id 或 password 参数', false)
  }

  const targetId = Number(user_id)

  // 防提权：非 admin（教师）不能重置 teacher/admin 账号的密码
  if (!isAdmin) {
    const targetRoles = await db
      .select({ code: schema.roles.code })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, targetId))
    if (targetRoles.some(r => r.code === 'teacher' || r.code === 'admin')) {
      return cResp(null, '无权限：不能重置教师/管理员账号的密码', false)
    }
  }

  try {
    const hashedPwd = await hashPassword(password)
    await db.update(schema.users).set({
      password: hashedPwd,
    }).where(eq(schema.users.id, targetId))

    // 失效该用户所有会话（强制重新登录）
    await db.update(schema.tokens)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(schema.tokens.userId, targetId),
        isNull(schema.tokens.deletedAt),
      ))

    return cResp({ reset: true })
  } catch (error: any) {
    console.error('重置密码失败:', error)
    return cResp(null, error.message || '重置失败', false)
  }
})
