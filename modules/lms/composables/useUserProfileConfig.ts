import { useLmsPublicConfig } from './useLmsPublicConfig'

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
 * 数据源：useLmsPublicConfig().user（来自 /api/config/lms-public 公开端点，无需鉴权）
 *   - 学生可读取，UI 决定字段是否禁用
 *   - 存储已拍平：lms:user.allowSelfAvatarUpload 等独立行
 *   - 实际修改仍由 admin 在 settingsModal 通过 /api/config/update 提交
 *
 * 注意：
 * - lms 禁用时此组合式函数仍可调用（useLmsPublicConfig 内部 fallback），返回 5 个开关均为 true
 * - 调用方应自行结合 hasRole('admin'|'teacher') 决定是否绕过限制
 */
export function useUserProfileConfig() {
  const { user, refresh: refreshLmsPublic } = useLmsPublicConfig()

  // 所有开关默认 true（"不限制"），只有显式 false 才视为禁止
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
    // 刷新 lms 公开配置（settingsModal 保存后调用）
    refresh: refreshLmsPublic,
  }
}
