import { getConfig } from '../../utils/config/reload'

/**
 * Public (no auth): return a safe subset of site config (strip sensitive fields like mail credentials)
 * Called by useSiteConfig, replaces original /api/site-config
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
