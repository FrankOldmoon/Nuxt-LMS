import { getConfig } from '../utils/config/reload'

/**
 * 公开站点配置的安全子集（剥离 mail 凭据等敏感字段）
 *
 * 抽出为函数，供两个入口复用：
 * - GET /api/config/get（base 单独运行时的引导入口）
 * - GET /api/bootstrap（lms 启用时与 LMS 公开配置 / 首页数据合并成一次请求）
 */
export async function getSiteConfigPublic() {
  const [
    siteTitle, siteDescription, siteLogo, siteFavicon, siteFooterText,
    defaultLocale, pageSize, allowRegistration, allowForgotPassword, maintenanceMode,
    showNotify, showMsg, showMyFiles, siteTimeZone,
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
    getConfig('site:timezone'),
  ])

  return {
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
    siteTimeZone,
  }
}
