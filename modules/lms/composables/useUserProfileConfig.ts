import { useLmsPublicConfig } from './useLmsPublicConfig'

/**
 * useUserProfileConfig — Read lms_config.user.* configuration (SSR compatible)
 *
 * Currently supported (all are exempt from admin/teacher role restrictions):
 * - allowSelfAvatarUpload: Whether to allow users to upload their own avatar
 * - allowChangePassword:   Whether to allow users to change their password
 * - allowChangeEmail:      Whether to allow users to change their email
 * - allowChangeLocale:     Whether to allow users to switch the interface language
 * - allowExportData:       Whether to allow users to export their personal learning data
 *
 * Data source: useLmsPublicConfig().user (from /api/config/lms-public public endpoint, no auth required)
 *   - Students can read it, the UI decides whether fields are disabled
 *   - Storage is flattened: lms:user.allowSelfAvatarUpload etc. are independent rows
 *   - Actual changes are still submitted by admin in settingsModal via /api/lms-config/update
 *
 * Note:
 * - This composable can still be called when lms is disabled (useLmsPublicConfig has internal fallback), all 5 switches return true
 * - Callers should combine with hasRole('admin'|'teacher') to decide whether to bypass restrictions
 */
export function useUserProfileConfig() {
  const { user, refresh: refreshLmsPublic } = useLmsPublicConfig()

  // All switches default to true ("no restriction"), only an explicit false is treated as prohibited
  const allowSelfAvatarUpload = computed<boolean>(() => user.value?.allowSelfAvatarUpload !== false)
  const allowChangePassword   = computed<boolean>(() => user.value?.allowChangePassword !== false)
  const allowChangeEmail      = computed<boolean>(() => user.value?.allowChangeEmail !== false)
  const allowChangeLocale     = computed<boolean>(() => user.value?.allowChangeLocale !== false)
  const allowExportData       = computed<boolean>(() => user.value?.allowExportData !== false)

  return {
    allowSelfAvatarUpload,
    allowChangePassword,
    allowChangeEmail,
    allowChangeLocale,
    allowExportData,
    // Refresh lms public config (called after settingsModal is saved)
    refresh: refreshLmsPublic,
  }
}
