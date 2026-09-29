import type { Ref } from 'vue'

/** 客户端默认值（镜像服务端 DEFAULT_SITE_CONFIG 的可编辑项） */
const DEFAULTS = {
  siteTitle: 'AI LMS',
  siteDescription: '',
  siteKeywords: '',
  siteLogo: '',
  siteFavicon: '',
  siteFooterText: '',
  siteDefaultLocale: 'en',
  siteTimezone: '',
  sitePageSize: 20,
  siteMaxFileSize: 50,
  siteAllowedFileTypes: '',
  siteMaintenanceMode: false,
  siteAllowRegistration: false,
  siteAllowForgotPassword: true,
  siteDefaultUserRole: 'student',
  sitePasswordMinLength: 6,
  siteSessionMaxAge: 604800,
  siteDriveQuota: 1073741824,
  siteTeacherDriveMultiplier: 1,
  siteShowNotify: true,
  siteShowMsg: true,
  siteShowMyFiles: true,
  mail: {
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    from: '',
    siteUrl: '',
  },
  peertube: {
    url: '',
    username: '',
    password: '',
    privacy: '1',
    channelId: '1',
  },
}

/** form ↔ API key 映射表 */
const KEY_MAP: { field: string; key: string }[] = [
  { field: 'siteTitle', key: 'site:title' },
  { field: 'siteDescription', key: 'site:description' },
  { field: 'siteKeywords', key: 'site:keywords' },
  { field: 'siteLogo', key: 'site:logo' },
  { field: 'siteFavicon', key: 'site:favicon' },
  { field: 'siteFooterText', key: 'site:footerText' },
  { field: 'siteDefaultLocale', key: 'site:defaultLocale' },
  { field: 'siteTimezone', key: 'site:timezone' },
  { field: 'sitePageSize', key: 'site:pageSize' },
  { field: 'siteMaxFileSize', key: 'site:maxFileSize' },
  { field: 'siteAllowedFileTypes', key: 'site:allowedFileTypes' },
  { field: 'siteMaintenanceMode', key: 'site:maintenanceMode' },
  { field: 'siteAllowRegistration', key: 'site:allowRegistration' },
  { field: 'siteAllowForgotPassword', key: 'site:allowForgotPassword' },
  { field: 'siteDefaultUserRole', key: 'site:defaultUserRole' },
  { field: 'sitePasswordMinLength', key: 'site:passwordMinLength' },
  { field: 'siteSessionMaxAge', key: 'site:sessionMaxAge' },
  { field: 'siteDriveQuota', key: 'site:driveQuota' },
  { field: 'siteTeacherDriveMultiplier', key: 'site:teacherDriveMultiplier' },
  { field: 'siteShowNotify', key: 'site:showNotify' },
  { field: 'siteShowMsg', key: 'site:showMsg' },
  { field: 'siteShowMyFiles', key: 'site:showMyFiles' },
]

const MAIL_KEY_MAP: { field: string; key: string }[] = [
  { field: 'host', key: 'site:mail.host' },
  { field: 'port', key: 'site:mail.port' },
  { field: 'secure', key: 'site:mail.secure' },
  { field: 'user', key: 'site:mail.user' },
  { field: 'pass', key: 'site:mail.pass' },
  { field: 'from', key: 'site:mail.from' },
  { field: 'siteUrl', key: 'site:mail.siteUrl' },
]

const PEERTUBE_KEY_MAP: { field: string; key: string }[] = [
  { field: 'url', key: 'site:peertube.url' },
  { field: 'username', key: 'site:peertube.username' },
  { field: 'password', key: 'site:peertube.password' },
  { field: 'privacy', key: 'site:peertube.privacy' },
  { field: 'channelId', key: 'site:peertube.channelId' },
]

/**
 * 站点设置表单：状态管理 + 加载/保存 + slot 扩展保存回调
 */
export function useSettingsForm(isOpen: Ref<boolean | undefined>) {
  const { t } = useI18n()
  const toast = useToast()
  const { refreshConfig } = useSiteConfig()

  const loading = ref(false)
  const saving = ref(false)

  const form = ref<any>({ ...DEFAULTS, mail: { ...DEFAULTS.mail }, peertube: { ...DEFAULTS.peertube } })

  // 扩展 slot：后续模块可通过 settings-extra slot 注入额外配置编辑器
  const slotSaveHandler = ref<(() => Promise<void>) | null>(null)
  function registerSlotSave(handler: () => Promise<void>) {
    slotSaveHandler.value = handler
  }

  watch(isOpen, async (val) => {
    if (val) await loadSettings()
  })

  async function loadSettings() {
    loading.value = true
    try {
      const rows = await cRequest<{ key: string; value: any }[]>('/api/config/list')
      const cfg: Record<string, any> = {}
      for (const r of rows) cfg[r.key] = r.value

      const next: any = {}
      for (const { field, key } of KEY_MAP) {
        next[field] = cfg[key] ?? (DEFAULTS as any)[field]
      }
      next.mail = {}
      for (const { field, key } of MAIL_KEY_MAP) {
        next.mail[field] = cfg[key] ?? (DEFAULTS.mail as any)[field]
      }
      next.peertube = {}
      for (const { field, key } of PEERTUBE_KEY_MAP) {
        next.peertube[field] = cfg[key] ?? (DEFAULTS.peertube as any)[field]
      }
      form.value = next
    } catch (e: any) {
      toast.add({ title: e.message || t('settings.loadFailed'), color: 'error' })
    } finally {
      loading.value = false
    }
  }

  function closeModal() {
    isOpen.value && (isOpen.value = false)
  }

  async function saveSettings() {
    saving.value = true
    try {
      const items = [
        ...KEY_MAP.map(({ field, key }) => ({ key, value: form.value[field] })),
        ...MAIL_KEY_MAP.map(({ field, key }) => ({ key, value: form.value.mail[field] })),
        ...PEERTUBE_KEY_MAP.map(({ field, key }) => ({ key, value: form.value.peertube[field] })),
      ]
      await cRequest('/api/config/update-batch', { method: 'POST', body: { items } })
      await cRequest('/api/config/reload', { method: 'POST' }).catch(() => {})

      // slot 注入组件的保存回调（如 lms 的 LmsConfigEditor）
      if (slotSaveHandler.value) {
        try {
          await slotSaveHandler.value()
        } catch (e: any) {
          toast.add({ title: e?.message || t('settings.updateFailed'), color: 'warning' })
        }
      }

      closeModal()
      toast.add({ title: t('settings.batchSaveSuccess'), color: 'success' })
      await refreshConfig()
    } catch (e: any) {
      toast.add({ title: e.message || t('settings.updateFailed'), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  return {
    t,
    loading,
    saving,
    form,
    registerSlotSave,
    loadSettings,
    closeModal,
    saveSettings,
  }
}
