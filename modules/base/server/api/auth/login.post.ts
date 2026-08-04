import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }

  // 查找用户
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (users.length === 0) {
    return cResp(null, 'Invalid username or password', false)
  }

  const user = users[0]

  // 验证密码
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return cResp(null, 'Invalid username or password', false)
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
