import { db, schema } from "@nuxthub/db"
import { eq, and, isNull } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { user_id, password } = body

  if (!user_id || !password) {
    return cResp(null, '缺少 user_id 或 password 参数', false)
  }

  try {
    const hashedPwd = await hashPassword(password)
    await db.update(schema.users).set({
      password: hashedPwd,
    }).where(eq(schema.users.id, Number(user_id)))

    // 失效该用户所有会话（强制重新登录）
    await db.update(schema.tokens)
      .set({ deletedAt: new Date() })
      .where(and(
        eq(schema.tokens.userId, Number(user_id)),
        isNull(schema.tokens.deletedAt),
      ))

    return cResp({ reset: true })
  } catch (error: any) {
    console.error('重置密码失败:', error)
    return cResp(null, error.message || '重置失败', false)
  }
})
