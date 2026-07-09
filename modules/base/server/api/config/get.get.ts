import { getConfig } from '../../utils/config'

/**
 * 公开（无鉴权）：返回站点配置的安全子集（剥离 mail 凭据等敏感字段）
 * 供 useSiteConfig 调用，替代原 /api/site-config
 */
export default defineEventHandler(async () => {
  const [
    siteTitle, siteDescription, siteLogo, siteFavicon, siteFooterText,
    defaultLocale, pageSize, allowRegistration, allowForgotPassword, maintenanceMode,
    showNotify, showMsg, showMyFiles,
  ] = await Promise.all([
    getConfig('site:title'),
    getConfig('site:description'),
    getConfig('site:logo'),
    getConfig('site:favicon'),
    getConfig('site:footerText'),
    getConfig('site:defaultLocale'),
    getConfig('site:pageSize'),
    getConfig('site:allowRegistration'),
    getConfig('site:allowForgotPassword'),
    getConfig('site:maintenanceMode'),
    getConfig('site:showNotify'),
    getConfig('site:showMsg'),
    getConfig('site:showMyFiles'),
  ])
  
  return cResp({
    siteTitle,
    siteDescription,
    siteLogo,
    siteFavicon,
    siteFooterText,
    defaultLocale,
    pageSize,
    allowRegistration,
    allowForgotPassword,
    maintenanceMode,
    showNotify,
    showMsg,
    showMyFiles,
  })
})
