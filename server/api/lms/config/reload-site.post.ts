import { reloadSiteConfig } from '../../../utils/siteConfig'

/**
 * 刷新 site_config 内存缓存
 * 管理员在 settingsModal 保存邮件配置后调用，使新配置立即生效
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  await reloadSiteConfig()
  return cResp(null, 'site_config 已刷新')
})
