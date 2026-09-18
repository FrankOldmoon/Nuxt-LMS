import { getLmsPublicConfig } from '../../utils/lmsPublicConfig'

/**
 * 公开（无鉴权）：返回 LMS 公开配置的安全子集
 *
 * 排除敏感分组：
 *   - ai.llmApiKey / ai.llmApiUrl（服务端 chat 代理用，不暴露前端）
 *   - _system.*（系统标记位，如 testAccountsSeeded）
 *
 * 注：lms 启用时首屏引导走 /api/bootstrap（与站点配置 / 首页数据合并），
 * 本端点保留用于单独拉取与向后兼容。
 */
export default defineEventHandler(() => {
  return cResp(getLmsPublicConfig())
})
