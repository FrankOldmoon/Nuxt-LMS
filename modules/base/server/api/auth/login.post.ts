import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }

  // 读取暴力破解防护配置（loginMaxAttempts=0 表示不限制）
  const maxAttempts = Number(await getConfig('site:loginMaxAttempts')) || 0
  const lockoutMinutes = Number(await getConfig('site:loginLockoutMinutes')) || 15

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

  // 检查账号锁定状态
  if (maxAttempts > 0 && user.lockedUntil) {
    const lockedUntilDate = new Date(user.lockedUntil)
    if (lockedUntilDate > new Date()) {
      const remainingMin = Math.ceil((lockedUntilDate.getTime() - Date.now()) / 60000)
      return cResp(null, `账号已锁定，请 ${remainingMin} 分钟后再试`, false)
    }
    // 锁定已过期，重置计数器
    await db.update(schema.users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id))
    user.failedAttempts = 0
    user.lockedUntil = null
  }

  // 验证密码
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    // 累加失败次数，达到阈值则锁定
    if (maxAttempts > 0) {
      const newAttempts = (Number(user.failedAttempts) || 0) + 1
      if (newAttempts >= maxAttempts) {
        await db.update(schema.users)
          .set({ failedAttempts: 0, lockedUntil: new Date(Date.now() + lockoutMinutes * 60000) })
          .where(eq(schema.users.id, user.id))
      } else {
        await db.update(schema.users)
          .set({ failedAttempts: newAttempts })
          .where(eq(schema.users.id, user.id))
      }
    }
    return cResp(null, 'Invalid username or password', false)
  }

  // 登录成功：重置失败计数与锁定状态
  if (maxAttempts > 0 && (user.failedAttempts || user.lockedUntil)) {
    await db.update(schema.users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(schema.users.id, user.id))
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
