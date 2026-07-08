<template>
  <UModal v-model:open="isOpen" scrollable>
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-6">{{ $t('settings.title') }}</h3>

        <div v-if="loading" class="flex justify-center py-8">
          <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-(--ui-text-muted)" />
        </div>

        <div v-else class="space-y-4">
          <!-- 网站标题 -->
          <UFormField :label="$t('settings.siteTitle')" class="w-full">
            <UInput
              v-model="form.siteTitle"
              :placeholder="$t('settings.siteTitlePlaceholder')"
              class="w-full"
            />
          </UFormField>

          <!-- 网站描述 -->
          <UFormField :label="$t('settings.siteDescription')" class="w-full">
            <UTextarea
              v-model="form.siteDescription"
              :placeholder="$t('settings.siteDescriptionPlaceholder')"
              :rows="3"
              class="w-full"
            />
          </UFormField>

          <!-- 是否开放注册 -->
          <UFormField :label="$t('settings.allowRegistration')" class="w-full">
            <USwitch v-model="form.allowRegistration" />
          </UFormField>

          <!-- 网站 Logo -->
          <UFormField :label="$t('settings.siteLogo')" class="w-full">
            <UInput
              v-model="form.siteLogo"
              :placeholder="$t('settings.siteLogoPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <!-- 每页显示数量 -->
          <UFormField :label="$t('settings.pageSize')" class="w-full">
            <UInput
              v-model.number="form.pageSize"
              type="number"
              :placeholder="$t('settings.pageSizePlaceholder')"
              class="w-full"
            />
          </UFormField>

          <!-- 邮件服务配置 -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('settings.mailConfig') }}</span>
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

          <!-- LMS 行为参数（lms 模块启用时由 LmsConfigEditor 包装组件注入） -->
          <slot
            name="lms-config"
            :on-save="registerSlotSave"
            :on-reload="loadSettings"
          />

          <!-- 保存按钮 -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              :label="$t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="closeModal"
            />
            <UButton
              :label="$t('common.save')"
              color="primary"
              :loading="saving"
              @click="saveSettings"
            />
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
const { hasRole } = useAuth()

const { refreshConfig } = useSiteConfig()

const loading = ref(false)
const saving = ref(false)

const form = ref({
  siteTitle: 'AI LMS',
  siteDescription: '',
  allowRegistration: true,
  siteLogo: '',
  pageSize: 20,
  mail: {
    host: '',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    from: '',
    siteUrl: '',
  },
})

// 插槽：LMS 模块可通过 lms-config 插槽注入 LmsConfigEditor 等组件。
// 插槽消费者通过 on-save 回调把"保存 lms_config"逻辑注册到 base，
// base 的 saveSettings() 会在 site_config 保存后调用该回调。
const slotSaveHandler = ref<(() => Promise<void>) | null>(null)

/**
 * 供 lms-config slot 消费者调用：注册一个在 base "保存"按钮点击时
 * 调用的异步函数（用于提交 lms_config 各分组）。
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
    const data = await cRequest<{ id: string; value: any }[]>('/api/configs/list')
    const siteConfig = data.find((c) => c.id === 'site_config')
    if (siteConfig && siteConfig.value) {
      form.value = {
        siteTitle: siteConfig.value.siteTitle ?? 'AI LMS',
        siteDescription: siteConfig.value.siteDescription ?? '',
        allowRegistration: siteConfig.value.allowRegistration ?? true,
        siteLogo: siteConfig.value.siteLogo ?? '',
        pageSize: siteConfig.value.pageSize ?? 20,
        mail: {
          host: siteConfig.value.mail?.host ?? '',
          port: siteConfig.value.mail?.port ?? 465,
          secure: siteConfig.value.mail?.secure ?? true,
          user: siteConfig.value.mail?.user ?? '',
          pass: siteConfig.value.mail?.pass ?? '',
          from: siteConfig.value.mail?.from ?? '',
          siteUrl: siteConfig.value.mail?.siteUrl ?? '',
        },
      }
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
    // 1) 保存 site_config（整列替换）
    await cRequest('/api/configs/update', {
      method: 'POST',
      body: {
        id: 'site_config',
        value: form.value,
      },
    })
    await cRequest('/api/reload-site', { method: 'POST' }).catch(() => {})

    // 2) 调用 slot 注入组件的保存回调（如 lms 模块启用了 LmsConfigEditor 包装）。
    // 失败时不影响 site_config 的成功提示，但用 warning 提示用户。
    if (slotSaveHandler.value) {
      try {
        await slotSaveHandler.value()
      } catch (e: any) {
        toast.add({ title: e?.message || t('settings.updateFailed'), color: 'warning' })
      }
    }

    closeModal()
    toast.add({ title: t('settings.updateSuccess'), color: 'success' })
    await refreshConfig()
  } catch (e: any) {
    toast.add({ title: e.message || t('settings.updateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
