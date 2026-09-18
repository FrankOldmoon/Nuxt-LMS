import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { verifyCredentials } from '../../utils/auth/credentials'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }

  // 校验账号密码 + 暴力破解防护（失败计数 / 指数退避锁定，与 startup 访问门共用同一实现）
  const result = await verifyCredentials(username, password)
  if (!result.ok) {
    if (result.locked) {
      return cResp(null, `账号已锁定，请 ${result.remainingMinutes} 分钟后再试`, false)
    }
    return cResp(null, 'Invalid username or password', false)
  }

  const user = result.user

  // 生成 token
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
  })

  // 更新最后登录信息
  await db
    .update(schema.users)
    .set({
      loginAt: new Date(),
      loginIp: getRequestIP(event) || null,
    })
    .where(eq(schema.users.id, user.id))

  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: getRequestProtocol(event) === 'https',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return cResp({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarImg: user.avatarImg,
    },
    token: tokenStr,
  }, 'Login successful')
})
