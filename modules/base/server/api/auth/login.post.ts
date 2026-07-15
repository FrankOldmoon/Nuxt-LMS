import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body || {}

  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }

  // Find user
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (users.length === 0) {
    return cResp(null, 'Invalid username or password', false)
  }

  const user = users[0]

  // Verify password
  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return cResp(null, 'Invalid username or password', false)
  }

  // Generate token
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
  })

  // Update last login info
  await db
    .update(schema.users)
    .set({
      loginAt: new Date(),
      loginIp: getRequestIP(event) || null,
    })
    .where(eq(schema.users.id, user.id))

  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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
