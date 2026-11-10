import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { generateToken } from './password'

/**
 * 为用户建立登录会话：签发 token 入库 + 写 auth_token HttpOnly cookie + 更新最后登录信息。
 * 与 login 流程一致，供 startup 访问门解锁时复用（门通过 = 已登录）。
 */
export async function createAuthSession(event: any, user: any): Promise<string> {
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({ name: tokenStr, userId: user.id })
  await db
    .update(schema.users)
    .set({ loginAt: new Date(), loginIp: clientIp(event) })
    .where(eq(schema.users.id, user.id))
  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return tokenStr
}