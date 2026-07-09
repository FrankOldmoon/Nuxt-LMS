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
 * course.config 结构（精简后）：
 *   {
 *     icon, color, level, coverImg,  // 课程特有字段
 *     ...extra,                       // 自定义 JSON
 *     lmsConfig: { ... }              // 课程级 lmsConfig 覆盖（运行时与全局 lms_config 深合并）
 *   }
 *
 * 数据流：
 * - initFromConfig(cfg)：
 *   1. 加载全局 lms_config（来自 /api/config/get）
 *   2. courseSwitches 初始化：cfg.lmsConfig.course > 全局 lms_config.course > 硬编码默认
 *      （不再从 cfg.showDanmaku 等顶层字段读取 — 这些已废弃）
 *   3. lmsConfig.value 初始化：全局 lms_config + cfg.lmsConfig 深合并
 *      （让 LmsConfigEditor 显示当前 effective 值，而非仅课程级覆盖）
 *   4. extra 提取 cfg 中 KNOWN_KEYS 之外的自定义字段
 * - buildConfig()：返回 { icon, color, level, coverImg, ...extra, lmsConfig: { ...lmsData, course: courseSwitches } }
 *   - result.lmsConfig 是完整的 effective 配置（全局+课程级），与运行时再次合并等价
 *   - courseSwitches 始终覆盖 lmsData.course（hideCourse 时 LmsConfigEditor 不输出 course 分组）
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

// 全局 lms_config 缓存（来自 /api/config/get，需 admin/teacher 权限）
const globalLmsConfig = ref<any>(null)
// 全局 lms_config.course.* 默认值（用于 courseSwitches 兜底）
const globalCourse = computed(() => globalLmsConfig.value?.course || {})

// 课程功能开关：lmsConfig.course.* 的课程级覆盖
// 初始化顺序：课程级 lmsConfig.course > 全局 lms_config.course > 硬编码默认
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

// KNOWN_KEYS：course.config 顶层只保留这些课程特有字段 + lmsConfig 覆盖
// 注释：showDanmaku 等"出现在顶层"的旧字段不再写入 result，但仍在 KNOWN_KEYS 中
// 防止它们落入 extra JSON（避免在 extraConfigText 出现冗余字段干扰用户）
const KNOWN_KEYS = ['icon', 'color', 'level', 'coverImg', 'lmsConfig', 'showDanmaku', 'showAnnouncement', 'showComments', 'showProgress', 'defaultChapterOpen']

/** 加载全局 lmsConfig（来自 /api/config/get） */
async function loadGlobalLmsConfig() {
  try {
    const data = await cRequest<any>('/api/config/get')
    globalLmsConfig.value = data || {}
  } catch {
    globalLmsConfig.value = {}
  }
}

/** 深合并：target（defaults）中存在的 key 优先于 source（overrides） */
function deepMerge(defaults: any, overrides: any): any {
  if (!overrides) return defaults
  if (defaults === null || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return overrides === undefined ? defaults : overrides
  }
  const result: any = { ...defaults }
  for (const [key, val] of Object.entries(overrides)) {
    const defVal = (defaults as any)[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)
        && defVal !== null && typeof defVal === 'object' && !Array.isArray(defVal)) {
      result[key] = deepMerge(defVal, val)
    } else {
      result[key] = val === undefined ? defVal : val
    }
  }
  return result
}

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
async function initFromConfig(cfg: Record<string, any>) {
  config.icon = cfg.icon || ''
  config.color = cfg.color || 'primary'
  config.level = cfg.level || t('home.levels.beginner')
  coverImg.value = cfg.coverImg || ''

  // 1. 加载全局 lmsConfig（首次必加载；后续 watcher 触发时已加载则跳过）
  if (!globalLmsConfig.value) {
    await loadGlobalLmsConfig()
  }

  // 2. 课程功能开关：课程级 cfg.lmsConfig.course > 全局 lms_config.course > 硬编码默认
  //    不再从 cfg.showDanmaku 等顶层字段读取（这些字段不再存于 course.config 顶层）
  const courseOverride = cfg.lmsConfig?.course || {}
  const gc = globalCourse.value
  courseSwitches.showDanmaku = courseOverride.showDanmaku ?? gc.showDanmaku ?? true
  courseSwitches.showAnnouncement = courseOverride.showAnnouncement ?? gc.showAnnouncement ?? true
  courseSwitches.showComments = courseOverride.showComments ?? gc.showComments ?? true
  courseSwitches.showProgress = courseOverride.showProgress ?? gc.showProgress ?? false
  courseSwitches.defaultChapterOpen = courseOverride.defaultChapterOpen ?? gc.defaultChapterOpen ?? true

  // 3. lmsConfig 初始化：全局 lms_config + cfg.lmsConfig 深合并
  //    LmsConfigEditor 内部还会再与 defaultConfig deep-merge，
  //    最终显示 = defaults + 全局 + 课程级覆盖
  lmsConfig.value = deepMerge(globalLmsConfig.value || {}, cfg.lmsConfig)

  // 4. extra JSON：只包含不在 KNOWN_KEYS 中的字段（即课程特有的自定义字段）
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
  // LmsConfigEditor 返回完整 config（hide-course 不含 course 分组）
  // 合并 courseSwitches 到 lmsData.course（始终覆盖，确保保存的是当前 UI 值）
  const lmsData = lmsConfigRef.value?.getConfig() || {}
  lmsData.course = { ...courseSwitches }
  result.lmsConfig = lmsData
  return result
}

defineExpose({ initFromConfig, buildConfig })
</script>
