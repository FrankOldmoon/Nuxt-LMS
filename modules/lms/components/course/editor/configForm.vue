<template>
  <div class="space-y-4">
    <USeparator :label="$t('courseEditor.configSection')" class="my-4" />

    <!-- 封面图片 -->
    <UFormField :label="$t('courseEditor.coverImage')" class="w-full">
      <div class="flex items-center gap-3">
        <div v-if="coverImg" class="relative group">
          <img :src="coverImg" class="w-32 h-20 object-cover rounded-lg border border-default" />
          <button
            class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            @click="coverImg = ''"
          >×</button>
        </div>
        <UButton
          :icon="coverImg ? 'i-lucide-refresh-cw' : 'i-lucide-image-plus'"
          variant="outline"
          size="sm"
          :loading="uploading"
          @click="triggerCoverUpload"
        />
        <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverFileSelected" />
      </div>
    </UFormField>

    <!-- 图片裁剪弹窗 -->
    <FormImageCropperModal
      ref="cropperRef"
      :title="$t('courseEditor.cropCover')"
      :aspect-ratio="16/10"
      stencil-type="rectangle"
      @uploaded="onCropped"
    />

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

    <!-- config 开关项（读取/写入 lmsConfig.course） -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.defaultChapterOpen') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.defaultChapterOpenHint') }}</p>
        </div>
        <USwitch v-model="courseSwitches.defaultChapterOpen" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showAnnouncement') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showAnnouncementHint') }}</p>
        </div>
        <USwitch v-model="courseSwitches.showAnnouncement" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showComments') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showCommentsHint') }}</p>
        </div>
        <USwitch v-model="courseSwitches.showComments" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showProgress') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showProgressHint') }}</p>
        </div>
        <USwitch v-model="courseSwitches.showProgress" />
      </div>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">{{ $t('courseEditor.showDanmaku') }}</p>
          <p class="text-xs text-muted">{{ $t('courseEditor.showDanmakuHint') }}</p>
        </div>
        <USwitch v-model="courseSwitches.showDanmaku" />
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

    <!--
      LMS 学习行为参数：原 lms 模块通过 doc 的 lms-config slot 注入 LmsConfigEditor (hide-course)。
      lms 已合并 lms，组件直接放在同模块 components/lms/ 下，可自动 import。
      课程级配置场景：hideCourse=true（course 分组开关由上方 courseSwitches 单独管理）。
    -->
    <LmsConfigEditor
      ref="lmsConfigRef"
      v-model="lmsConfig"
      hide-course
    />
  </div>
</template>

<script setup lang="ts">
/**
 * lms 课程编辑器配置表单
 *
 * 整合 doc 基础（封面/图标/颜色/难度/课程功能开关/extra JSON）和
 * lms 增强（学习行为参数：question/homework/quiz/comment/race/exp 规则、
 * 章节按钮、课程按钮、首页/课程列表/章节页显隐、AI 助手、网盘存储等）。
 *
 * 数据流：
 * - initFromConfig(cfg)：填充顶层字段（icon/color/level/coverImg）+ courseSwitches
 *   + extra JSON；同时把 cfg.lmsConfig 写入 lmsConfig ref，触发 LmsConfigEditor 内部 deep-merge。
 * - buildConfig()：返回 { icon, color, level, coverImg, ...extra, lmsConfig: { ...lmsData, course: courseSwitches } }，
 *   其中 lmsData = LmsConfigEditor.getConfig()（不含 course 分组），courseSwitches 覆盖优先级最高。
 */
const { t } = useI18n()
const toast = useToast()

const config = reactive({
  icon: '',
  color: 'primary',
  level: '',
})

const coverImg = ref('')
const uploading = ref(false)
const coverInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<{ setImage: (file: File) => void } | null>(null)

// 课程功能开关（存储在 lmsConfig.course 中，单课程可覆盖全局默认值）
const courseSwitches = reactive({
  showDanmaku: true,
  showAnnouncement: true,
  showComments: true,
  showProgress: false,
  defaultChapterOpen: true,
})

const extraConfigText = ref('{}')
const extraConfigError = ref('')
const lmsConfigRef = ref<{ getConfig: () => any } | null>(null)
const lmsConfig = ref<any>(null)

const colorOpts = computed(() => colorOptions())
const levelOpts = computed(() => levelOptions())

const KNOWN_KEYS = ['icon', 'color', 'level', 'coverImg', 'lmsConfig', 'showDanmaku', 'showAnnouncement', 'showComments', 'showProgress', 'defaultChapterOpen']

function triggerCoverUpload() {
  coverInputRef.value?.click()
}

async function onCoverFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.add({ title: t('courseEditor.imageOnly'), color: 'error' })
    return
  }

  // 打开裁剪弹窗
  cropperRef.value?.setImage(file)
}

// 裁剪完成后更新封面
function onCropped(url: string) {
  coverImg.value = url
}

/** 从课程 config 对象初始化表单 */
function initFromConfig(cfg: Record<string, any>) {
  config.icon = cfg.icon || ''
  config.color = cfg.color || 'primary'
  config.level = cfg.level || t('home.levels.beginner')
  coverImg.value = cfg.coverImg || ''

  // 课程功能开关：优先读取 lmsConfig.course，兼容旧版顶层字段
  const courseCfg = cfg.lmsConfig?.course || {}
  courseSwitches.showDanmaku = courseCfg.showDanmaku ?? cfg.showDanmaku ?? true
  courseSwitches.showAnnouncement = courseCfg.showAnnouncement ?? cfg.showAnnouncement ?? true
  courseSwitches.showComments = courseCfg.showComments ?? cfg.showComments ?? true
  courseSwitches.showProgress = courseCfg.showProgress ?? cfg.showProgress ?? false
  courseSwitches.defaultChapterOpen = courseCfg.defaultChapterOpen ?? cfg.defaultChapterOpen ?? true

  // LMS 配置（课程级覆盖；LmsConfigEditor 自身会 deep-merge 到内部 defaultConfig）
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

/** 合并 config 已知字段 + lmsConfig.course 开关 + extra JSON，返回最终 config */
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
    coverImg: coverImg.value || undefined,
    ...extra,
  }
  // 获取 LMS 配置（hideCourse 时不含 course 分组），合并课程功能开关
  const lmsData = lmsConfigRef.value?.getConfig() || {}
  lmsData.course = { ...courseSwitches }
  result.lmsConfig = lmsData
  return result
}

defineExpose({ initFromConfig, buildConfig })
</script>
