import { inject, provide, type InjectionKey } from 'vue'

interface ConfigEditorProps {
  modelValue: Record<string, any> | null
  hideCourse: boolean
}

const ConfigEditorKey = Symbol('ConfigEditor') as InjectionKey<ReturnType<typeof useConfigEditor>>

export function provideConfigEditor(ctx: ReturnType<typeof useConfigEditor>) {
  provide(ConfigEditorKey, ctx)
}

export function useConfigEditorContext() {
  const ctx = inject(ConfigEditorKey)
  if (!ctx) throw new Error('useConfigEditorContext must be used within LmsConfigEditor')
  return ctx
}

/**
 * LMS 全局/课程配置编辑器：响应式 config + 选项列表 + 双向同步
 */
export function useConfigEditor(props: ConfigEditorProps, emit: (e: 'update:modelValue', value: any) => void) {
  const { t } = useI18n()

  const defaultConfig = {
    ai: { enabled: true, mode: 'api', model: '', thinking: false, apiUrl: '/api/aichat/chat', llmApiUrl: '', llmApiKey: '', ollamaUrl: 'http://localhost:11434', ollamaModel: '', title: '', preset: '', opening: '', ttsGender: 'female' },
    question: { submitExp: 2, correctBonusExp: 5, firstCorrectBonusExp: 10, maxSubmitCount: 999 },
    homework: { submitExp: 5, resubmitExp: 1, latePenalty: 0.8 },
    comment: { publishExp: 3, replyExp: 2, likeReceivedExp: 1, maxDailyExp: 20 },
    chapter: { headingExp: 5, headingCoin: 5, headingScore: 5 },
    race: { participateExp: 10, rank1Exp: 100, rank2Exp: 80, rank3Exp: 60, participationExp: 30 },
    quiz: { submitExp: 3, passScore: 60, passBonusExp: 10 },
    general: { dailyExpCap: 100, levelStep: 100 },
    course: { showDanmaku: true, showAnnouncement: true, showComments: true, showProgress: false, defaultChapterOpen: true },
    chapterBtns: { showPlay: true, showScore: true, showSelect: true, showTimer: true, showInvite: true, showDanmaku: true, showVote: true, showQuickAnswer: true },
    courseBtns: { showProgress: true, showLeaderboard: true, showGroups: true, showGrades: true, showAnnouncements: true, showWrongBook: true },
    user: { allowSelfAvatarUpload: true, allowChangePassword: true, allowChangeEmail: true, allowChangeLocale: true, allowExportData: true },
    home: { showHero: true, showStats: true, showRecentCourses: true, showLeaderboard: true },
    courseList: { showSearch: true, showFilter: true, showSort: true, defaultView: 'grid' },
    chapterPage: { showOutline: true, showNote: true, showDanmakuPanel: true, enableFullscreen: true },
    storage: { driveSize: 1073741824, teacherMultiplier: 1 },
    // 提交后班级弹幕广播开关（对应 utils/ws/submitBroadcast.ts 的过滤规则）
    danmaku: {
      enableOnQuestion: true,
      enableOnHomework: true,
      enableOnQuiz: true,
      enableOnComment: true,
      questionOnlyOnCorrect: true,
      onlyOnReward: true,
    },
  }

  const aiModeOpts = computed(() => [
    { label: t('lmsConfig.aiModeApi'), value: 'api' },
    { label: t('lmsConfig.aiModeLocal'), value: 'local' },
    { label: t('lmsConfig.aiModeOllama'), value: 'ollama' },
  ])

  const ttsGenderOpts = computed(() => [
    { label: t('lmsConfig.aiTtsFemale'), value: 'female' },
    { label: t('lmsConfig.aiTtsMale'), value: 'male' },
  ])

  const defaultViewOpts = computed(() => [
    { label: t('lmsConfig.defaultViewGrid'), value: 'grid' },
    { label: t('lmsConfig.defaultViewList'), value: 'list' },
  ])

  const config: any = reactive(JSON.parse(JSON.stringify(defaultConfig)))

  function deepMerge(target: any, source: any) {
    for (const key of Object.keys(source)) {
      if (typeof target[key] === 'object' && typeof source[key] === 'object' && !Array.isArray(target[key])) {
        deepMerge(target[key], source[key])
      } else {
        target[key] = source[key]
      }
    }
  }

  watch(() => props.modelValue, (val) => {
    if (val) deepMerge(config, val)
  }, { immediate: true, deep: true })

  watch(config, () => {
    emit('update:modelValue', JSON.parse(JSON.stringify(config)))
  }, { deep: true })

  function getConfig() {
    const data = JSON.parse(JSON.stringify(config))
    if (props.hideCourse) delete data.course
    return data
  }

  return {
    config, aiModeOpts, ttsGenderOpts, defaultViewOpts,
    hideCourse: computed(() => props.hideCourse),
    getConfig,
  }
}
