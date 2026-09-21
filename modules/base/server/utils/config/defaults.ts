/**
 * site 配置默认值（拍平存储）
 *
 * 每个 key 独立存为 configs 表一行（id = 带点 key，value = 标量 jsonb）。
 * 由 settingsModal 读写，启动插件播种默认值。
 */
export const DEFAULT_SITE_CONFIG: Record<string, any> = {
  // 站点基础
  'site:title': 'AI LMS',
  'site:description': '',
  'site:keywords': '',
  'site:logo': '',
  'site:favicon': '',
  'site:footerText': '',
  'site:defaultLocale': 'en',
  'site:timezone': '',
  'site:pageSize': 20,
  'site:maxFileSize': 50,
  'site:allowedFileTypes': '',
  'site:maintenanceMode': false,
  // 账号安全
  'site:allowRegistration': false,
  'site:allowForgotPassword': true,
  'site:defaultUserRole': 'student',
  'site:passwordMinLength': 6,
  'site:sessionMaxAge': 604800,
  // 网盘配额
  'site:driveQuota': 1073741824,
  'site:teacherDriveMultiplier': 1,
  // 邮件
  'site:mail.host': '',
  'site:mail.port': 465,
  'site:mail.secure': true,
  'site:mail.user': '',
  'site:mail.pass': '',
  'site:mail.from': '',
  'site:mail.siteUrl': '',
  // 前端页面显示控制（拍平）
  'site:showNotify': true,
  'site:showMsg': true,
  'site:showMyFiles': true,
}
