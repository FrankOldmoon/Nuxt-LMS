import { reloadSiteConfig } from '../utils/siteConfig'

export default defineEventHandler(async () => {
  await reloadSiteConfig()
  return cResp(null, '配置已重载')
})
