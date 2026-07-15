import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Check if registration is enabled in system settings
  if (!(await getConfig('site:allowRegistration'))) {
    return cResp(null, 'Registration is disabled', false)
  }

  const body = await readBody(event)
  const { username, password, name, email } = body || {}

  // Parameter validation
  if (!username || !password || !name) {
    return cResp(null, 'Username, password and name are required', false)
  }

  // Password length validation
  const minLen = Number(await getConfig('site:passwordMinLength')) || 6
  if (password.length < minLen) {
    return cResp(null, `Password must be at least ${minLen} characters`, false)
  }

  // Check if username already exists
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)

  if (existing.length > 0) {
    return cResp(null, 'Username already exists', false)
  }

  // Password hash
  const hashedPwd = await hashPassword(password)

  // Create user
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

  // Assign default role
  await assignRoleToUser(user.id, String(await getConfig('site:defaultUserRole')) || 'student')

  // Generate token and store in database
  const tokenStr = generateToken()
  await db.insert(schema.tokens).values({
    name: tokenStr,
    userId: user.id,
  })

  // Set cookie
  setCookie(event, 'auth_token', tokenStr, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return cResp({ user, token: tokenStr }, 'Registration successful')
})
