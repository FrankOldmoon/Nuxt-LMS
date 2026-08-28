import { verifyStartupPassword } from '../../utils/startup'

// 提交启动密码，服务端校验通过后签发 HttpOnly cookie
export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => null)
  const { password } = (body || {}) as { password?: string }
  if (!password) {
    return cResp(null, 'Password is required', false)
  }
  if (!verifyStartupPassword(event, password)) {
    return cResp(null, 'Incorrect access password', false)
  }
  return cResp({ unlocked: true })
})