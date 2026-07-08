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

          <!-- AI 助手配置（全局默认值，写入 lms_config.ai） -->
          <div class="border border-default rounded-lg p-4 space-y-3 bg-elevated/30">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-bot" class="size-4 text-primary" />
              <span class="text-sm font-semibold">{{ $t('lmsConfig.ai') }}</span>
            </div>
            <p class="text-xs text-muted">{{ $t('lmsConfig.aiHint') }}</p>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="$t('lmsConfig.aiMode')" class="w-full">
                <USelect v-model="lmsAi.mode" :items="aiModeOpts" size="sm" class="w-full" />
              </UFormField>
              <UFormField :label="$t('lmsConfig.aiTtsGender')" class="w-full">
                <USelect v-model="lmsAi.ttsGender" :items="ttsGenderOpts" size="sm" class="w-full" />
              </UFormField>
            </div>
            <!-- 后端 LLM API 配置（api 模式，敏感信息） -->
            <div v-if="lmsAi.mode === 'api'" class="space-y-3 border border-dashed border-default rounded-lg p-3">
              <UFormField :label="$t('lmsConfig.aiLlmApiUrl')" class="w-full">
                <UInput v-model="lmsAi.llmApiUrl" placeholder="https://open.bigmodel.cn/api/paas/v4" size="sm" class="w-full" />
              </UFormField>
              <UFormField :label="$t('lmsConfig.aiLlmApiKey')" :hint="$t('lmsConfig.aiLlmApiKeyHint')" class="w-full">
                <UInput v-model="lmsAi.llmApiKey" type="password" placeholder="sk-..." size="sm" class="w-full" />
              </UFormField>
              <UFormField :label="$t('lmsConfig.aiModel')" class="w-full">
                <UInput v-model="lmsAi.model" :placeholder="$t('lmsConfig.aiModelPlaceholder')" size="sm" class="w-full" />
              </UFormField>
              <div class="flex items-center justify-between">
                <span class="text-sm">{{ $t('lmsConfig.aiThinking') }}</span>
                <USwitch v-model="lmsAi.thinking" />
              </div>
            </div>
            <!-- Ollama 配置（ollama 模式，浏览器直连） -->
            <div v-if="lmsAi.mode === 'ollama'" class="space-y-3 border border-dashed border-default rounded-lg p-3">
              <UFormField :label="$t('lmsConfig.aiOllamaUrl')" class="w-full">
                <UInput v-model="lmsAi.ollamaUrl" placeholder="http://localhost:11434" size="sm" class="w-full" />
              </UFormField>
              <UFormField :label="$t('lmsConfig.aiOllamaModel')" class="w-full">
                <UInput v-model="lmsAi.ollamaModel" placeholder="llama3.2" size="sm" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="$t('lmsConfig.aiApiUrl')" class="w-full">
              <UInput v-model="lmsAi.apiUrl" placeholder="/api/aichat/chat" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="$t('lmsConfig.aiTitle')" class="w-full">
              <UInput v-model="lmsAi.title" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="$t('lmsConfig.aiPreset')" class="w-full">
              <UTextarea v-model="lmsAi.preset" :rows="2" size="sm" class="w-full" />
            </UFormField>
            <UFormField :label="$t('lmsConfig.aiOpening')" class="w-full">
              <UTextarea v-model="lmsAi.opening" :rows="2" size="sm" class="w-full" />
            </UFormField>
          </div>

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
const { refreshAiConfig } = useAiConfig()

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

// lms_config.ai 分组（全局 AI 助手默认配置）
const lmsAi = ref({
  mode: 'api',
  model: '',
  thinking: false,
  apiUrl: '/api/aichat/chat',
  llmApiUrl: '',
  llmApiKey: '',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: '',
  title: '',
  preset: '',
  opening: '',
  ttsGender: 'female',
})

const aiModeOpts = computed(() => [
  { label: t('lmsConfig.aiModeApi'), value: 'api' },
  { label: t('lmsConfig.aiModeLocal'), value: 'local' },
  { label: t('lmsConfig.aiModeOllama'), value: 'ollama' },
])

const ttsGenderOpts = computed(() => [
  { label: t('lmsConfig.aiTtsFemale'), value: 'female' },
  { label: t('lmsConfig.aiTtsMale'), value: 'male' },
])

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
    // 加载 lms_config.ai 分组（/api/config/get 返回完整 lms_config，含 ai）
    const lmsResp = await cRequest<any>('/api/config/get').catch(() => null)
    if (lmsResp && lmsResp.ai) {
      lmsAi.value = { ...lmsAi.value, ...lmsResp.ai }
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
    // 保存 site_config（整列替换）
    await cRequest('/api/configs/update', {
      method: 'POST',
      body: {
        id: 'site_config',
        value: form.value,
      },
    })
    await cRequest('/api/reload-site', { method: 'POST' }).catch(() => {})

    // 保存 lms_config.ai（深合并，不清空其他分组）
    await cRequest('/api/config/update', {
      method: 'POST',
      body: { ai: lmsAi.value },
    }).catch((e: any) => {
      toast.add({ title: e?.message || 'AI config save failed', color: 'warning' })
    })

    closeModal()
    toast.add({ title: t('settings.updateSuccess'), color: 'success' })
    await refreshConfig()
    await refreshAiConfig()
  } catch (e: any) {
    toast.add({ title: e.message || t('settings.updateFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>
