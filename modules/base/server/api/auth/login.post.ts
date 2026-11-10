import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { verifyCredentials } from '../../utils/auth/credentials'
import { isGatedLoginAllowed } from '../../utils/auth/hostPolicy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }

  // 校验账号密码（与 startup 访问门共用同一实现；已移除失败锁定防护）
  const result = await verifyCredentials(username, password)
  if (!result.ok) {
    return cResp(null, 'Invalid username or password', false)
  }

  const user = result.user

  // 非 IP 的 URL（正式域名）：登录同样仅允许教师及以上账号，
  // 防止学生绕过访问门直接调用登录接口拿到会话。
  if (!(await isGatedLoginAllowed(event, user.id))) {
    return cResp(null, '该站点仅开放教师及以上账号登录', false)
  }

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
      loginIp: clientIp(event),
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
