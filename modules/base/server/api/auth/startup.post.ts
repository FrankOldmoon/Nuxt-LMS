import { verifyStartupLogin } from '../../utils/startup'
import { createAuthSession } from '../../utils/auth/session'

// 提交访问门账号密码 → 校验通过即建立登录会话（gate 等于登录，保留登录状态）
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const { username, password } = (body || {}) as { username?: string; password?: string }
  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }
  // 校验账号密码并签发 startup 解锁 cookie，返回用户
  const user = await verifyStartupLogin(event, username, password)
  if (!user) {
    return cResp(null, 'Invalid username or password', false)
  }
  // 等价登录：建立登录会话（auth_token cookie），后登录态保持
  await createAuthSession(event, user)
  return cResp({
    unlocked: true,
    user: { id: user.id, username: user.username, name: user.name },
  })
})