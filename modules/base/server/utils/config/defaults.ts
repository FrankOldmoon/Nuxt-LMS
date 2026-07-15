/**
 * Site config default values (flattened storage)
 *
 * Each key is stored independently as a row in the configs table (id = dotted key, value = scalar jsonb).
 * Read/written by settingsModal, seeded with default values by the startup plugin.
 */
export const DEFAULT_SITE_CONFIG: Record<string, any> = {
  // Site basics
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
  // Account security
  'site:allowRegistration': false,
  'site:allowForgotPassword': true,
  'site:defaultUserRole': 'student',
  'site:passwordMinLength': 6,
  'site:sessionMaxAge': 604800,
  'site:loginMaxAttempts': 0,
  'site:loginLockoutMinutes': 15,
  // Drive quota
  'site:driveQuota': 1073741824,
  'site:teacherDriveMultiplier': 1,
  // Mail
  'site:mail.host': '',
  'site:mail.port': 465,
  'site:mail.secure': true,
  'site:mail.user': '',
  'site:mail.pass': '',
  'site:mail.from': '',
  'site:mail.siteUrl': '',
  // Frontend page display control (flattened)
  'site:showNotify': true,
  'site:showMsg': true,
  'site:showMyFiles': true,
}
