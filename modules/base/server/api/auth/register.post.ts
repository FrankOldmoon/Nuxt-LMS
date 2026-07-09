import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // 检查系统设置是否开放注册
  if (!(await getConfig('site:allowRegistration'))) {
    return cResp(null, 'Registration is disabled', false)
  }

  const body = await readBody(event)
  const { username, password, name, email } = body || {}

  // 参数校验
  if (!username || !password || !name) {
    return cResp(null, 'Username, password and name are required', false)
  }

  // 密码长度校验
  const minLen = Number(await getConfig('site:passwordMinLength')) || 6
  if (password.length < minLen) {
    return cResp(null, `Password must be at least ${minLen} characters`, false)
  }

  // 检查用户名是否已存在
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (existing.length > 0) {
    return cResp(null, 'Username already exists', false)
  }

  // 密码哈希
  const hashedPwd = await hashPassword(password)

  // 创建用户
  const [user] = await db
    .insert(schema.users)
    .values({
      username,
      password: hashedPwd,
      name,
      email: email || null,
    })
    .returning({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      email: schema.users.email,
      avatarImg: schema.users.avatarImg,
    })

  // 分配默认角色
  await assignRoleToUser(user.id, String(await getConfig('site:defaultUserRole')) || 'student')

  // 生成 token 并存入数据库
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
  })

  // 设置 cookie
  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 天
    path: '/',
  })

  return cResp({ user, token: tokenStr }, 'Registration successful')
})
