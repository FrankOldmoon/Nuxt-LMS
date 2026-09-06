import type { InjectionKey } from 'vue'

/**
 * 课程编辑器配置表单：基本信息 + 封面图片 + 课程配置 + LMS 配置
 *
 * 通过 provide/inject 共享同一实例：
 * - index.vue 提供（provideCourseConfigForm），在 content / learning tab 渲染封面图与学习行为开关
 * - configForm.vue 注入（useCourseConfigFormContext），渲染 Display tab（基本信息 + 显示配置）
 */
export function useCourseConfigForm(form?: Ref<CourseBasicForm>) {
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

  const globalLmsConfig = ref<any>(null)
  const globalCourse = computed(() => globalLmsConfig.value?.course || {})

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

  type CourseSwitchKey = 'defaultChapterOpen' | 'showAnnouncement' | 'showComments' | 'showProgress' | 'showDanmaku'
  const courseSwitchList: { key: CourseSwitchKey; label: string; hint: string }[] = [
    { key: 'defaultChapterOpen', label: 'courseEditor.defaultChapterOpen', hint: 'courseEditor.defaultChapterOpenHint' },
    { key: 'showAnnouncement', label: 'courseEditor.showAnnouncement', hint: 'courseEditor.showAnnouncementHint' },
    { key: 'showComments', label: 'courseEditor.showComments', hint: 'courseEditor.showCommentsHint' },
    { key: 'showProgress', label: 'courseEditor.showProgress', hint: 'courseEditor.showProgressHint' },
    { key: 'showDanmaku', label: 'courseEditor.showDanmaku', hint: 'courseEditor.showDanmakuHint' },
  ]

  const KNOWN_KEYS = ['icon', 'color', 'level', 'coverImg', 'lmsConfig', 'showDanmaku', 'showAnnouncement', 'showComments', 'showProgress', 'defaultChapterOpen']

  async function loadGlobalLmsConfig() {
    try {
      const data = await cRequest<any>('/api/config/lms')
      globalLmsConfig.value = data || {}
    } catch {
      globalLmsConfig.value = {}
    }
  }

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
    cropperRef.value?.setImage(file)
  }

  function onCropped(url: string) {
    coverImg.value = url
  }

  async function initFromConfig(cfg: Record<string, any>) {
    config.icon = cfg.icon || ''
    config.color = cfg.color || 'primary'
    config.level = cfg.level || t('home.levels.beginner')
    coverImg.value = cfg.coverImg || ''

    if (!globalLmsConfig.value) {
      await loadGlobalLmsConfig()
    }

    const courseOverride = cfg.lmsConfig?.course || {}
    const gc = globalCourse.value
    courseSwitches.showDanmaku = courseOverride.showDanmaku ?? gc.showDanmaku ?? true
    courseSwitches.showAnnouncement = courseOverride.showAnnouncement ?? gc.showAnnouncement ?? true
    courseSwitches.showComments = courseOverride.showComments ?? gc.showComments ?? true
    courseSwitches.showProgress = courseOverride.showProgress ?? gc.showProgress ?? false
    courseSwitches.defaultChapterOpen = courseOverride.defaultChapterOpen ?? gc.defaultChapterOpen ?? true

    lmsConfig.value = deepMerge(globalLmsConfig.value || {}, cfg.lmsConfig)

    const extra: Record<string, any> = {}
    for (const key of Object.keys(cfg)) {
      if (!KNOWN_KEYS.includes(key)) {
        extra[key] = cfg[key]
      }
    }
    extraConfigText.value = JSON.stringify(extra, null, 2)
    extraConfigError.value = ''
  }

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
    const lmsData = lmsConfigRef.value?.getConfig() || {}
    lmsData.course = { ...courseSwitches }
    result.lmsConfig = lmsData
    return result
  }

  return {
    form, config, coverImg, uploading, coverInputRef, cropperRef,
    courseSwitches, courseSwitchList,
    extraConfigText, extraConfigError, lmsConfigRef, lmsConfig,
    colorOpts, levelOpts,
    triggerCoverUpload, onCoverFileSelected, onCropped,
    initFromConfig, buildConfig,
  }
}

type CourseConfigFormCtx = ReturnType<typeof useCourseConfigForm>
export const CourseConfigFormKey: InjectionKey<CourseConfigFormCtx> = Symbol('CourseConfigForm')

/** 课程基本信息（name / code / tags），由 useCourseEditor 提供、configForm.vue 展示 */
export interface CourseBasicForm {
  name: string
  code: string
  tags: string[]
}

/** 创建并 provide 配置表单上下文（由 course/editor/index.vue 调用一次） */
export function provideCourseConfigForm(form?: Ref<CourseBasicForm>): CourseConfigFormCtx {
  const ctx = useCourseConfigForm(form)
  provide(CourseConfigFormKey, ctx)
  return ctx
}

/** 注入配置表单上下文（由 configForm.vue 等子组件调用） */
export function useCourseConfigFormContext(): CourseConfigFormCtx {
  const ctx = inject(CourseConfigFormKey)
  if (!ctx) throw new Error('useCourseConfigFormContext must be used within provideCourseConfigForm')
  return ctx
}
