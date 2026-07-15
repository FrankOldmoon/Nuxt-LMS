import { db, schema } from "@nuxthub/db"
import { eq } from "drizzle-orm"

export default eventHandler(async (event) => {
  await requireRole(event, ['teacher', 'admin'])

  const body = await readBody(event)
  const { user_id, password } = body

  if (!user_id || !password) {
    return cResp(null, 'Missing user_id or password parameter', false)
  }

  try {
    const hashedPwd = await hashPassword(password)
    await db.update(schema.users).set({
      password: hashedPwd,
    }).where(eq(schema.users.id, Number(user_id)))

    return cResp({ reset: true })
  } catch (error: any) {
    console.error('Reset password failed:', error)
    return cResp(null, error.message || 'Reset failed', false)
  }
})
