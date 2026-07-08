import { useFetch } from '#app'

/**
 * useUserProfileConfig — 读取 lms_config.user.* 配置（SSR 兼容）
 *
 * 当前支持（均受 admin/teacher 角色限制豁免）：
 * - allowSelfAvatarUpload: 是否允许用户自行上传头像
 * - allowChangePassword:   是否允许用户修改密码
 * - allowChangeEmail:      是否允许用户修改邮箱
 * - allowChangeLocale:     是否允许用户切换界面语言
 * - allowExportData:       是否允许用户导出个人学习数据
 *
 * 注意：
 * - lms 禁用时此组合式函数仍可调用，返回 5 个开关均为 true
 * - lms 启用且 config 尚未初始化时返回 5 个开关均为 true（与 server DEFAULT 一致）
 * - 调用方应自行结合 hasRole('admin'|'teacher') 决定是否绕过限制
 */
export function useUserProfileConfig() {
  const { data, refresh } = useFetch<{
    user?: {
      allowSelfAvatarUpload?: boolean
      allowChangePassword?: boolean
      allowChangeEmail?: boolean
      allowChangeLocale?: boolean
      allowExportData?: boolean
    }
  }>('/api/config/get', {
    key: 'lms-user-profile-config',
    server: true,
    lazy: false,
    transform: (raw: any) => {
      if (raw && raw.success && raw.data) {
        return raw.data
      }
      return {}
    },
  })

  const user = computed(() => data.value?.user || {})

  // 所有开关默认 true（"不限制"），只有显式 false 才视为禁止
  const allowSelfAvatarUpload = computed<boolean>(() => user.value.allowSelfAvatarUpload !== false)
  const allowChangePassword   = computed<boolean>(() => user.value.allowChangePassword !== false)
  const allowChangeEmail      = computed<boolean>(() => user.value.allowChangeEmail !== false)
  const allowChangeLocale     = computed<boolean>(() => user.value.allowChangeLocale !== false)
  const allowExportData       = computed<boolean>(() => user.value.allowExportData !== false)

  return {
    allowSelfAvatarUpload,
    allowChangePassword,
    allowChangeEmail,
    allowChangeLocale,
    allowExportData,
    refresh,
  }
}
