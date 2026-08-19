import { computed, ref, reactive, watch, nextTick, onBeforeUnmount, inject } from 'vue'

export function useVideo(props: any) {
  const { t } = useI18n()
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()
  const chapterTask = useChapterTask()

  // ── 配置解析 ──
  const videoSrc = computed(() => {
    const opts = props.question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
      return opts.src || ''
    }
    return ''
  })

  const subQuestions = computed(() => {
    const opts = props.question?.options
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return []
    const qs = Array.isArray(opts.questions) ? opts.questions : []
    return qs
      .map((q: any) => ({ cid: Number(q.cid) || 0, at: Number(q.at) || 0 }))
      .filter(q => q.cid > 0)
      .sort((a, b) => a.at - b.at)
  })

  // ── record 状态（watchedRatio + subRecords） ──
  // record[0] 形式存储：{ watchedRatio: 0~1, subRecords: { cid: { correct: bool } } }
  const record = computed(() => {
    const r = props.question?.record
    if (Array.isArray(r) && r.length > 0) return r[0] || {}
    return {}
  })

  const watchedRatio = ref(0)
  const subRecords = reactive<Record<number, { correct: boolean, submitted: boolean }>>({})  // cid -> { correct: bool, submitted: bool }

  // 从 record 初始化
  watch(record, (rec) => {
    if (rec && typeof rec === 'object') {
      watchedRatio.value = Math.max(0, Math.min(1, Number(rec.watchedRatio) || 0))
      if (rec.subRecords && typeof rec.subRecords === 'object') {
        for (const [cid, st] of Object.entries(rec.subRecords)) {
          subRecords[Number(cid)] = { correct: !!(st as any)?.correct, submitted: true }
        }
      }
    }
  }, { immediate: true, deep: true })

  // 派生：已答对的子题数
  const correctSubCount = computed(() => {
    return Object.values(subRecords).filter(s => s.correct).length
  })

  // 整体是否通过（同时满足：watchedRatio >= 0.95 + 所有子题答对）
  const allPassed = computed(() => {
    return watchedRatio.value >= 0.95 && correctSubCount.value >= subQuestions.value.length && subQuestions.value.length > 0
  })

  const statusText = computed(() => {
    if (allPassed.value) return t('question.videoCompleted')
    if (watchedRatio.value < 0.95) return t('question.videoNeedWatchFull')
    return t('question.videoNeedAllCorrect')
  })

  // ── 视频播放控制 ──
  const videoEl = ref<any>(null)
  const duration = ref(0)
  const activeQuestion = ref<any>(null)  // 当前弹出的题目
  const activeSubCorrect = ref(false)  // 当前弹出题目是否答对
  // 已触发的题目 cid 集合（用于回放时不再弹）
  const triggered = reactive<Record<number, boolean>>({})

  function onLoadedMetadata() {
    duration.value = videoEl.value?.duration || 0
  }

  function onTimeUpdate() {
    const v = videoEl.value
    if (!v) return
    const t = v.currentTime
    // 更新 watchedRatio（取最大值，防止回退）
    if (duration.value > 0) {
      const ratio = Math.max(0, Math.min(1, t / duration.value))
      if (ratio > watchedRatio.value) watchedRatio.value = ratio
    }
    // 触发题目弹出
    if (!activeQuestion.value) {
      const next = subQuestions.value.find(q => !triggered[q.cid] && t >= q.at)
      if (next) triggerQuestion(next)
    }
  }

  function onVideoEnded() {
    // 视频结束时，确保 watchedRatio = 1
    if (duration.value > 0) {
      watchedRatio.value = 1
    }
    // 如果有子题未弹出，强制弹出
    if (!activeQuestion.value) {
      const next = subQuestions.value.find(q => !triggered[q.cid])
      if (next) triggerQuestion(next)
    }
  }

  function triggerQuestion(q: any) {
    triggered[q.cid] = true
    activeQuestion.value = q
    activeSubCorrect.value = false
    if (videoEl.value) videoEl.value.pause()
  }

  function dismissQuestion() {
    activeQuestion.value = null
    nextTick(() => {
      // 关闭后再次检查：若拖动跳过了多个题目时间点，依次弹出下一个
      if (!activeQuestion.value) {
        const v = videoEl.value
        if (v) {
          const next = subQuestions.value.find(q => !triggered[q.cid] && v.currentTime >= q.at)
          if (next) {
            triggerQuestion(next)
            return
          }
          // 没有新的题目需要弹出时，恢复播放
          v.play().catch(() => { /* 用户未交互时 play 可能被拒绝，忽略 */ })
        }
      }
    })
  }

  // 子题提交回调
  function onSubQuestionSubmitted({ isCorrect: correct, questionId: qid }: { isCorrect: boolean, questionId: number }) {
    if (activeQuestion.value && activeQuestion.value.cid === qid) {
      activeSubCorrect.value = correct
      // 记录到 subRecords
      subRecords[qid] = { correct, submitted: true }
    }
  }

  // 父组件（render.vue）询问当前数据时返回
  function submit() {
    // 整体通过才计为正确（视频观看进度 + 子题由客户端判定，服务端透传该结果）
    const passed = allPassed.value
    if (passed) {
      // 上报题目完成状态（quiz 模式下由 quiz 统一上报）
      if (!props.inQuiz) {
        chapterTask?.reportNodeDone('question', props.questionId, true)
      }
    }
    // 设置 inject 的 submitted/isCorrect（用于显示结果 UI）
    if (submitted) submitted.value = true
    if (isCorrect) isCorrect.value = passed
    if (fromRecord) fromRecord.value = false

    // 提交到后端
    import('./shared').then(({ submitQuestion }) => {
      submitQuestion({
        questionId: props.questionId,
        userAnswer: [passed ? 1 : 0],
        courseId: courseId.value,
        chapterId: chapterId.value,
        point: props.question?.point,
        question: props.question,
      })
    })

    return { isCorrect: passed }
  }

  function reset() {
    watchedRatio.value = 0
    Object.keys(subRecords).forEach(k => delete subRecords[Number(k)])
    Object.keys(triggered).forEach(k => delete triggered[Number(k)])
    activeQuestion.value = null
    activeSubCorrect.value = false
    if (videoEl.value) {
      videoEl.value.currentTime = 0
    }
  }

  const hasAnswer = computed(() => {
    return allPassed.value || (watchedRatio.value >= 0.95 && correctSubCount.value > 0)
  })

  function fillCorrectAnswer() {
    // 假装"通过"
    watchedRatio.value = 1
    for (const q of subQuestions.value) {
      subRecords[q.cid] = { correct: true, submitted: true }
      triggered[q.cid] = true
    }
  }

  // ── 工具函数 ──
  function pct(at: number) {
    if (!duration.value) return 0
    return Math.min(100, Math.max(0, (at / duration.value) * 100))
  }

  function formatTime(s: number) {
    if (s == null || isNaN(s) || s < 0) return '00:00'
    const sec = Math.floor(s)
    const m = Math.floor(sec / 60)
    const ss = sec % 60
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  onBeforeUnmount(() => {
    activeQuestion.value = null
  })

  return {
    videoSrc,
    subQuestions,
    watchedRatio,
    subRecords,
    correctSubCount,
    allPassed,
    statusText,
    videoEl,
    activeQuestion,
    activeSubCorrect,
    onLoadedMetadata,
    onTimeUpdate,
    onVideoEnded,
    dismissQuestion,
    onSubQuestionSubmitted,
    submit,
    reset,
    hasAnswer,
    fillCorrectAnswer,
    pct,
    formatTime,
  }
}
