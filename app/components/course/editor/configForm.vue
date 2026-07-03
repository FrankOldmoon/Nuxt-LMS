<template>
  <div class="space-y-4">
    <USeparator :label="$t('courseEditor.configSection')" class="my-4" />

    <!-- config 中的图标 -->
    <UFormField :label="$t('courseEditor.icon')" class="w-full">
      <UInput v-model="config.icon" :placeholder="$t('courseEditor.iconPlaceholder')" class="w-full" />
    </UFormField>

    <!-- config 中的颜色 -->
    <UFormField :label="$t('courseEditor.color')" class="w-full">
      <USelect v-model="config.color" :items="colorOpts" class="w-full" />
    </UFormField>

    <!-- config 中的难度 -->
    <UFormField :label="$t('courseEditor.level')" class="w-full">
      <USelect v-model="config.level" :items="levelOpts" class="w-full" />
    </UFormField>

    <!-- config 开关项 -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showAnnouncement') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showAnnouncementHint') }}</p>
        </div>
        <USwitch v-model="config.showAnnouncement" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showComments') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showCommentsHint') }}</p>
        </div>
        <USwitch v-model="config.showComments" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showProgress') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showProgressHint') }}</p>
        </div>
        <USwitch v-model="config.showProgress" />
      </div>
    </div>

    <!-- 自定义 config 参数（JSON） -->
    <UFormField :label="$t('courseEditor.extraConfig')" class="w-full">
      <UTextarea
        v-model="extraConfigText"
        :placeholder="$t('courseEditor.extraConfigPlaceholder')"
        :rows="3"
        class="w-full font-mono text-xs"
      />
      <p v-if="extraConfigError" class="text-xs text-error mt-1">{{ extraConfigError }}</p>
    </UFormField>

    <!-- LMS 学习行为参数（课程级覆盖） -->
    <LmsConfigEditor ref="lmsConfigRef" v-model="lmsConfig" />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const config = reactive({
  icon: '',
  color: 'primary',
  level: '',
  showAnnouncement: true,
  showComments: true,
  showProgress: false,
})

const extraConfigText = ref('{}')
const extraConfigError = ref('')
const lmsConfigRef = ref<any>(null)
const lmsConfig = ref<any>(null)

const colorOpts = computed(() => colorOptions())
const levelOpts = computed(() => levelOptions())

const KNOWN_KEYS = ['icon', 'color', 'level', 'showAnnouncement', 'showComments', 'showProgress', 'lmsConfig']

/** 从课程 config 对象初始化表单 */
function initFromConfig(cfg: Record<string, any>) {
  config.icon = cfg.icon || ''
  config.color = cfg.color || 'primary'
  config.level = cfg.level || t('home.levels.beginner')
  config.showAnnouncement = cfg.showAnnouncement ?? true
  config.showComments = cfg.showComments ?? true
  config.showProgress = cfg.showProgress ?? false

  // LMS 配置（课程级覆盖）
  lmsConfig.value = cfg.lmsConfig || null

  const extra: Record<string, any> = {}
  for (const key of Object.keys(cfg)) {
    if (!KNOWN_KEYS.includes(key)) {
      extra[key] = cfg[key]
    }
  }
  extraConfigText.value = JSON.stringify(extra, null, 2)
  extraConfigError.value = ''
}

/** 合并 config 已知字段 + lmsConfig + extra JSON，返回最终 config */
function buildConfig(): Record<string, any> | null {
  let extra: Record<string, any> = {}
  try {
    extra = JSON.parse(extraConfigText.value || '{}')
    extraConfigError.value = ''
  } catch {
    extraConfigError.value = t('settings.invalidJson')
    return null
  }
  const result: Record<string, any> = {
    icon: config.icon || undefined,
    color: config.color,
    level: config.level,
    showAnnouncement: config.showAnnouncement,
    showComments: config.showComments,
    showProgress: config.showProgress,
    ...extra,
  }
  // 添加 LMS 配置（课程级覆盖）
  const lmsData = lmsConfigRef.value?.getConfig()
  if (lmsData) {
    result.lmsConfig = lmsData
  }
  return result
}

defineExpose({ initFromConfig, buildConfig })
</script>
