import { computed, ref, reactive, watch, nextTick, onBeforeUnmount, inject } from 'vue'

export function useVideo(props: any) {
  const { t } = useI18n()
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()
  const chapterTask = useChapterTask()

  // ── ConfigurationAnalysis ──
  const videoSrc = computed(() => {
    const opts = props.question?.options
    if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
      return opts.src || ''
    }
    return ''
  })

  const sub-questions = computed(() => {
    const opts = props.question?.options
    if (!opts || typeof opts !== 'object' || Array.isArray(opts)) return []
    const qs = Array.isArray(opts.questions) ? opts.questions : []
    return qs
      .map((q: any) => ({ cid: Number(q.cid) || 0, at: Number(q.at) || 0 }))
      .filter(q => q.cid > 0)
      .sort((a, b) => a.at - b.at)
  })

  // ── record Status（watchedRatio + subRecords） ──
  // record[0] Shapeformat storage：{ watchedRatio: 0~1, subRecords: { cid: { correct: bool } } }
  const record = computed(() => {
    const r = props.question?.record
    if (Array.isArray(r) && r.length > 0) return r[0] || {}
    return {}
  })

  const watchedRatio = ref(0)
  const subRecords = reactive<Record<number, { correct: boolean, submitted: boolean }>>({})  // cid -> { correct: bool, submitted: bool }

  // from record Initialize
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

  // derive：alreadyanswerRightchild question count
  const correctSubCount = computed(() => {
    return Object.values(subRecords).filter(s => s.correct).length
  })

  // wholeBodyYesNoPass（samewhenFullsufficient：watchedRatio >= 0.95 + Allchild question answerRight）
  const allPassed = computed(() => {
    return watchedRatio.value >= 0.95 && correctSubCount.value >= sub-questions.value.length && sub-questions.value.length > 0
  })

  const statusText = computed(() => {
    if (allPassed.value) return t('question.videoCompleted')
    if (watchedRatio.value < 0.95) return t('question.videoNeedWatchFull')
    return t('question.videoNeedAllCorrect')
  })

  // ── Video Playbackcontrol ──
  const videoEl = ref<any>(null)
  const duration = ref(0)
  const activeQuestion = ref<any>(null)  // CurrentpopupQuestion
  const activeSubCorrect = ref(false)  // CurrentpopupQuestionYesNoanswerRight
  // alreadyTriggerQuestion cid Set（useinnot when replayingthenpopup）
  const triggered = reactive<Record<number, boolean>>({})

  function onLoadedMetadata() {
    duration.value = videoEl.value?.duration || 0
  }

  function onTimeUpdate() {
    const v = videoEl.value
    if (!v) return
    const t = v.currentTime
    // Update watchedRatio（takeMaxValue，prevent regression）
    if (duration.value > 0) {
      const ratio = Math.max(0, Math.min(1, t / duration.value))
      if (ratio > watchedRatio.value) watchedRatio.value = ratio
    }
    // TriggerQuestionpopup
    if (!activeQuestion.value) {
      const next = sub-questions.value.find(q => !triggered[q.cid] && t >= q.at)
      if (next) triggerQuestion(next)
    }
  }

  function onVideoEnded() {
    // VideoEndwhen，ensure watchedRatio = 1
    if (duration.value > 0) {
      watchedRatio.value = 1
    }
    // IfHaschild question not popped up，force popup
    if (!activeQuestion.value) {
      const next = sub-questions.value.find(q => !triggered[q.cid])
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
      // CloseBackthentimescheck：ifdragSkipManyitemsQuestionTimePoint，dependingtimespopupDownoneitems
      if (!activeQuestion.value) {
        const v = videoEl.value
        if (v) {
          const next = sub-questions.value.find(q => !triggered[q.cid] && v.currentTime >= q.at)
          if (next) {
            triggerQuestion(next)
            return
          }
          // notHasNewQuestionwhen popup is needed，ResumePlay
          v.play().catch(() => { /* Userwhen not interacted play cancanReject，Ignore */ })
        }
      }
    })
  }

  // child question submitCallback
  function onSub-question submitted({ isCorrect: correct, questionId: qid }: { isCorrect: boolean, questionId: number }) {
    if (activeQuestion.value && activeQuestion.value.cid === qid) {
      activeSubCorrect.value = correct
      // Recordsto subRecords
      subRecords[qid] = { correct, submitted: true }
    }
  }

  // Parent Component（render.vue）askCurrent DatawhenReturn
  function submit() {
    // wholeBodyPassonlycalculateCorrect
    const passed = allPassed.value
    if (passed) {
      // UpreportQuestionCompleteStatus（quiz mode downby quiz unifyUpreport）
      if (!props.inQuiz) {
        chapterTask?.reportNodeDone('question', props.questionId, true)
      }
    }
    // Settings inject  submitted/isCorrect（useinShowresult UI）
    if (submitted) submitted.value = true
    if (isCorrect) isCorrect.value = passed
    if (fromRecord) fromRecord.value = false

    // SubmittoBackserver
    import('./shared').then(({ submitQuestion }) => {
      submitQuestion({
        questionId: props.questionId,
        userAnswer: [passed ? 1 : 0],
        isCorrect: passed,
        correctRate: passed ? 1 : 0,
        courseId: courseId.value,
        chapterId: chapterId.value,
        point: props.question?.point,
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
    // Falsepackage"Pass"
    watchedRatio.value = 1
    for (const q of sub-questions.value) {
      subRecords[q.cid] = { correct: true, submitted: true }
      triggered[q.cid] = true
    }
  }

  // ── toolFunction ──
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
    sub-questions,
    watchedRatio,
    subRecords,
    correctSubCount,
    allPassed,
    statusText,
    videoEl,
    activeQuestion,
    activeSubCorrect,
    on loadedMetadata,
    onTimeUpdate,
    onVideoEnded,
    dismissQuestion,
    onSub-question submitted,
    submit,
    reset,
    hasAnswer,
    fillCorrectAnswer,
    pct,
    formatTime,
  }
}
