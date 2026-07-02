import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const tokenStr = getCookie(event, 'auth_token')
  if (tokenStr) {
    // 软删除 token
    await db
      .update(schema.tokens)
      .set({ deletedAt: new Date() })
      .where(eq(schema.tokens.name, tokenStr))
  }

  // 清除 cookie
  deleteCookie(event, 'auth_token', { path: '/' })

  return cResp(null, 'Logged out')
})
