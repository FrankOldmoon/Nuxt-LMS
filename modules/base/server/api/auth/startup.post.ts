import { verifyStartupLogin } from '../../utils/startup'
import { createAuthSession } from '../../utils/auth/session'

// 提交访问门账号密码 → 校验通过即建立登录会话（gate 等于登录，保留登录状态）
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const { username, password } = (body || {}) as { username?: string; password?: string }
  if (!username || !password) {
    return cResp(null, 'Username and password are required', false)
  }
  // 校验账号密码并签发 startup 解锁 cookie（已移除失败锁定防护）
  const result = await verifyStartupLogin(event, username, password)
  if (!result.ok) {
    // 非 IP 域名（正式站点）：仅教师及以上账号可通过访问门
    if (result.forbidden) {
      return cResp(null, '该站点仅开放教师及以上账号登录', false)
    }
    return cResp(null, 'Invalid username or password', false)
  }
  const user = result.user
  // 等价登录：建立登录会话（auth_token cookie），后登录态保持
  await createAuthSession(event, user)
  return cResp({
    unlocked: true,
    user: { id: user.id, username: user.username, name: user.name },
  })
})