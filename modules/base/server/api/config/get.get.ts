import { getSiteConfigPublic } from '../../utils/siteConfigPublic'

/**
 * 公开（无鉴权）：返回站点配置的安全子集（剥离 mail 凭据等敏感字段）
 * 供 useSiteConfig 调用，替代原 /api/site-config
 *
 * 注：lms 启用时首屏引导走 /api/bootstrap（把本站点配置与 LMS 公开配置 / 首页数据合并），
 * 本端点保留用于 base 单独运行与外部直接调用。
 */
export default defineEventHandler(async () => {
  return cResp(await getSiteConfigPublic())
})
