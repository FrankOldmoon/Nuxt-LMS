import { isStartupUnlocked } from '../../utils/startup'

// 查询当前是否已通过启动密码（凭 HttpOnly cookie 于服务端校验）
export default defineEventHandler(async (event) => {
  return cResp({ unlocked: isStartupUnlocked(event) })
})