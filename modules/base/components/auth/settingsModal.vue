<template>
  <UModal v-model:open="isOpen" scrollable>
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-6">{{ $t('settings.title') }}</h3>

        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-(--ui-text-muted)" />
        </div>

        <div v-else class="space-y-4">
          <!-- ===================== General ===================== -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-settings" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.generalSection') }}</span>
            </div>
            <UFormField :label="$t('settings.siteTitle')" class="w-full">
              <UInput v-model="form.siteTitle" :placeholder="$t('settings.siteTitlePlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.siteDescription')" class="w-full">
              <UTextarea v-model="form.siteDescription" :placeholder="$t('settings.siteDescriptionPlaceholder')" :rows="2" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.siteKeywords')" class="w-full">
              <UInput v-model="form.siteKeywords" :placeholder="$t('settings.siteKeywordsPlaceholder')" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.siteLogo')" class="w-full">
                <UInput v-model="form.siteLogo" :placeholder="$t('settings.siteLogoPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.siteFavicon')" class="w-full">
                <UInput v-model="form.siteFavicon" :placeholder="$t('settings.siteFaviconPlaceholder')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="$t('settings.siteFooterText')" class="w-full">
              <UInput v-model="form.siteFooterText" :placeholder="$t('settings.siteFooterTextPlaceholder')" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.defaultLocale')" class="w-full">
                <UInput v-model="form.siteDefaultLocale" placeholder="en" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.timezone')" class="w-full">
                <UInput v-model="form.siteTimezone" placeholder="UTC" class="w-full" />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.pageSize')" class="w-full">
                <UInput v-model.number="form.sitePageSize" type="number" :min="1" :placeholder="$t('settings.pageSizePlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.maxFileSize')" class="w-full">
                <UInput v-model.number="form.siteMaxFileSize" type="number" :min="1" :placeholder="$t('settings.maxFileSizePlaceholder')" class="w-full">
                  <template #trailing>
                    <span class="text-xs text-muted">MB</span>
                  </template>
                </UInput>
              </UFormField>
            </div>
            <UFormField :label="$t('settings.allowedFileTypes')" class="w-full">
              <UInput v-model="form.siteAllowedFileTypes" :placeholder="$t('settings.allowedFileTypesPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.maintenanceMode')" class="w-full">
              <USwitch v-model="form.siteMaintenanceMode" />
            </UFormField>
          </div>

          <!-- ===================== Account & Security ===================== -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.securitySection') }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.allowRegistration')" class="w-full">
                <USwitch v-model="form.siteAllowRegistration" />
              </UFormField>
              <UFormField :label="$t('settings.allowForgotPassword')" class="w-full">
                <USwitch v-model="form.siteAllowForgotPassword" />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.defaultUserRole')" class="w-full">
                <UInput v-model="form.siteDefaultUserRole" :placeholder="$t('settings.defaultUserRolePlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.passwordMinLength')" class="w-full">
                <UInput v-model.number="form.sitePasswordMinLength" type="number" :min="1" class="w-full" />
              </UFormField>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <UFormField :label="$t('settings.sessionMaxAge')" class="w-full">
                <UInput v-model.number="form.siteSessionMaxAge" type="number" :min="0" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.loginMaxAttempts')" class="w-full">
                <UInput v-model.number="form.siteLoginMaxAttempts" type="number" :min="0" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.loginLockoutMinutes')" class="w-full">
                <UInput v-model.number="form.siteLoginLockoutMinutes" type="number" :min="0" class="w-full" />
              </UFormField>
            </div>
          </div>

          <!-- ===================== Storage ===================== -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-hard-drive" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.storageSection') }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.driveQuota')" class="w-full">
                <UInput v-model.number="form.siteDriveQuota" type="number" :min="0" :placeholder="$t('settings.driveQuotaPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.teacherDriveMultiplier')" class="w-full">
                <UInput v-model.number="form.siteTeacherDriveMultiplier" type="number" :min="1" class="w-full" />
              </UFormField>
            </div>
          </div>

          <!-- ===================== UI Visibility ===================== -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-eye" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.uiSection') }}</span>
            </div>
            <p class="text-xs text-muted">控制前端页面/按钮的显示，保存后通过 WebSocket 实时推送给所有在线客户端</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UFormField :label="$t('settings.showNotify')" class="w-full">
                <USwitch v-model="form.siteShowNotify" />
              </UFormField>
              <UFormField :label="$t('settings.showMsg')" class="w-full">
                <USwitch v-model="form.siteShowMsg" />
              </UFormField>
              <UFormField :label="$t('settings.showMyFiles')" class="w-full">
                <USwitch v-model="form.siteShowMyFiles" />
              </UFormField>
            </div>
          </div>

          <!-- ===================== Mail ===================== -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.mailSection') }}</span>
            </div>
            <p class="text-xs text-muted">{{ $t('settings.mailConfigHint') }}</p>
            <UFormField :label="$t('settings.mailHost')" class="w-full">
              <UInput v-model="form.mail.host" :placeholder="$t('settings.mailHostPlaceholder')" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('settings.mailPort')" class="w-full">
                <UInput v-model.number="form.mail.port" type="number" :placeholder="'465'" class="w-full" />
              </UFormField>
              <UFormField :label="$t('settings.mailSecure')" class="w-full">
                <USwitch v-model="form.mail.secure" />
              </UFormField>
            </div>
            <UFormField :label="$t('settings.mailUser')" class="w-full">
              <UInput v-model="form.mail.user" :placeholder="$t('settings.mailUserPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.mailPass')" class="w-full">
              <UInput v-model="form.mail.pass" type="password" :placeholder="$t('settings.mailPassPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.mailFrom')" class="w-full">
              <UInput v-model="form.mail.from" :placeholder="$t('settings.mailFromPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('settings.siteUrl')" class="w-full">
              <UInput v-model="form.mail.siteUrl" :placeholder="$t('settings.siteUrlPlaceholder')" class="w-full" />
            </UFormField>
          </div>

          <!-- 扩展 slot：后续模块（如 lms）可注入额外配置编辑器 -->
          <slot name="settings-extra" :on-save="registerSlotSave" :on-reload="loadSettings" />

          <!-- 保存按钮 -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="saveSettings" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const isOpen = defineModel<boolean>('open', { default: false })
const toast = useToast()
const { t } = useI18n()

const { refreshConfig } = useSiteConfig()

const loading = ref(false)
const saving = ref(false)

// 客户端默认值（镜像服务端 DEFAULT_SITE_CONFIG 的可编辑项）
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
  siteLoginMaxAttempts: 0,
  siteLoginLockoutMinutes: 15,
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
}

const form = ref({ ...DEFAULTS, mail: { ...DEFAULTS.mail } })

// 扩展 slot：后续模块可通过 settings-extra slot 注入额外配置编辑器，
// 并通过 on-save 回调注册异步保存逻辑。saveSettings 在 site 配置保存后调用该回调。
const slotSaveHandler = ref<(() => Promise<void>) | null>(null)

/**
 * 供 settings-extra slot 消费者调用：注册一个在 site 配置保存后调用的异步函数。
 * 仅保留最后一次注册（slot 重新挂载时自动覆盖）。
 */
function registerSlotSave(handler: () => Promise<void>) {
  slotSaveHandler.value = handler
}

watch(isOpen, async (val) => {
  if (val) {
    await loadSettings()
  }
})

async function loadSettings() {
  loading.value = true
  try {
    const rows = await cRequest<{ key: string; value: any }[]>('/api/config/list')
    const cfg: Record<string, any> = {}
    for (const r of rows) cfg[r.key] = r.value

    form.value = {
      siteTitle: cfg['site:title'] ?? DEFAULTS.siteTitle,
      siteDescription: cfg['site:description'] ?? DEFAULTS.siteDescription,
      siteKeywords: cfg['site:keywords'] ?? DEFAULTS.siteKeywords,
      siteLogo: cfg['site:logo'] ?? DEFAULTS.siteLogo,
      siteFavicon: cfg['site:favicon'] ?? DEFAULTS.siteFavicon,
      siteFooterText: cfg['site:footerText'] ?? DEFAULTS.siteFooterText,
      siteDefaultLocale: cfg['site:defaultLocale'] ?? DEFAULTS.siteDefaultLocale,
      siteTimezone: cfg['site:timezone'] ?? DEFAULTS.siteTimezone,
      sitePageSize: cfg['site:pageSize'] ?? DEFAULTS.sitePageSize,
      siteMaxFileSize: cfg['site:maxFileSize'] ?? DEFAULTS.siteMaxFileSize,
      siteAllowedFileTypes: cfg['site:allowedFileTypes'] ?? DEFAULTS.siteAllowedFileTypes,
      siteMaintenanceMode: cfg['site:maintenanceMode'] ?? DEFAULTS.siteMaintenanceMode,
      siteAllowRegistration: cfg['site:allowRegistration'] ?? DEFAULTS.siteAllowRegistration,
      siteAllowForgotPassword: cfg['site:allowForgotPassword'] ?? DEFAULTS.siteAllowForgotPassword,
      siteDefaultUserRole: cfg['site:defaultUserRole'] ?? DEFAULTS.siteDefaultUserRole,
      sitePasswordMinLength: cfg['site:passwordMinLength'] ?? DEFAULTS.sitePasswordMinLength,
      siteSessionMaxAge: cfg['site:sessionMaxAge'] ?? DEFAULTS.siteSessionMaxAge,
      siteLoginMaxAttempts: cfg['site:loginMaxAttempts'] ?? DEFAULTS.siteLoginMaxAttempts,
      siteLoginLockoutMinutes: cfg['site:loginLockoutMinutes'] ?? DEFAULTS.siteLoginLockoutMinutes,
      siteDriveQuota: cfg['site:driveQuota'] ?? DEFAULTS.siteDriveQuota,
      siteTeacherDriveMultiplier: cfg['site:teacherDriveMultiplier'] ?? DEFAULTS.siteTeacherDriveMultiplier,
      siteShowNotify: cfg['site:showNotify'] ?? DEFAULTS.siteShowNotify,
      siteShowMsg: cfg['site:showMsg'] ?? DEFAULTS.siteShowMsg,
      siteShowMyFiles: cfg['site:showMyFiles'] ?? DEFAULTS.siteShowMyFiles,
      mail: {
        host: cfg['site:mail.host'] ?? DEFAULTS.mail.host,
        port: cfg['site:mail.port'] ?? DEFAULTS.mail.port,
        secure: cfg['site:mail.secure'] ?? DEFAULTS.mail.secure,
        user: cfg['site:mail.user'] ?? DEFAULTS.mail.user,
        pass: cfg['site:mail.pass'] ?? DEFAULTS.mail.pass,
        from: cfg['site:mail.from'] ?? DEFAULTS.mail.from,
        siteUrl: cfg['site:mail.siteUrl'] ?? DEFAULTS.mail.siteUrl,
      },
    }
  } catch (e: any) {
    toast.add({ title: e.message || t('settings.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

function closeModal() {
  isOpen.value = false
}

async function saveSettings() {
  saving.value = true
  try {
    // 1) 拍平 form 为 items 批量保存
    const items = [
      { key: 'site:title', value: form.value.siteTitle },
      { key: 'site:description', value: form.value.siteDescription },
      { key: 'site:keywords', value: form.value.siteKeywords },
      { key: 'site:logo', value: form.value.siteLogo },
      { key: 'site:favicon', value: form.value.siteFavicon },
      { key: 'site:footerText', value: form.value.siteFooterText },
      { key: 'site:defaultLocale', value: form.value.siteDefaultLocale },
      { key: 'site:timezone', value: form.value.siteTimezone },
      { key: 'site:pageSize', value: form.value.sitePageSize },
      { key: 'site:maxFileSize', value: form.value.siteMaxFileSize },
      { key: 'site:allowedFileTypes', value: form.value.siteAllowedFileTypes },
      { key: 'site:maintenanceMode', value: form.value.siteMaintenanceMode },
      { key: 'site:allowRegistration', value: form.value.siteAllowRegistration },
      { key: 'site:allowForgotPassword', value: form.value.siteAllowForgotPassword },
      { key: 'site:defaultUserRole', value: form.value.siteDefaultUserRole },
      { key: 'site:passwordMinLength', value: form.value.sitePasswordMinLength },
      { key: 'site:sessionMaxAge', value: form.value.siteSessionMaxAge },
      { key: 'site:loginMaxAttempts', value: form.value.siteLoginMaxAttempts },
      { key: 'site:loginLockoutMinutes', value: form.value.siteLoginLockoutMinutes },
      { key: 'site:driveQuota', value: form.value.siteDriveQuota },
      { key: 'site:teacherDriveMultiplier', value: form.value.siteTeacherDriveMultiplier },
      { key: 'site:showNotify', value: form.value.siteShowNotify },
      { key: 'site:showMsg', value: form.value.siteShowMsg },
      { key: 'site:showMyFiles', value: form.value.siteShowMyFiles },
      { key: 'site:mail.host', value: form.value.mail.host },
      { key: 'site:mail.port', value: form.value.mail.port },
      { key: 'site:mail.secure', value: form.value.mail.secure },
      { key: 'site:mail.user', value: form.value.mail.user },
      { key: 'site:mail.pass', value: form.value.mail.pass },
      { key: 'site:mail.from', value: form.value.mail.from },
      { key: 'site:mail.siteUrl', value: form.value.mail.siteUrl },
    ]
    await cRequest('/api/config/update-batch', { method: 'POST', body: { items } })
    await cRequest('/api/config/reload', { method: 'POST' }).catch(() => {})

    // 2) 调用 slot 注入组件的保存回调（如 lms 的 LmsConfigEditor）
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
</script>
