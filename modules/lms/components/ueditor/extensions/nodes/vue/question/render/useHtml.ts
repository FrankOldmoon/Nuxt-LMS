import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useHtml(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  const iframeRef = ref(null)
  const containerRef = ref(null)
  const isFullscreen = ref(false)

  // FullscreenSwitch
  function toggleFullscreen() {
    if (!import.meta.client) return
    const el = containerRef.value
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }

  function onFullscreenChange() {
    isFullscreen.value = document.fullscreenElement === containerRef.value
  }

  // HTML Content
  const htmlContent = computed(() => {
    const c = props.question.content
    if (typeof c === 'string') return c
    return ''
  })

  // iframe pass inAccuracy Rate
  const latestRate = ref(null)

  const hasAnswer = computed(() => latestRate.value !== null)

  // listen iframe message（Pass event.source distinguish differentsame iframe）
  function onMessage(event) {
    // onlyHandlefromCurrent iframe Message
    if (event.source !== iframeRef.value?.contentWindow) return
    if (event.data && typeof event.data === 'object' && event.data.type === 'correct_rate') {
      const rate = Number(event.data.rate)
      if (!isNaN(rate) && rate >= 0 && rate <= 1) {
        latestRate.value = rate
        if (submitted.value) {
          submitted.value = false
        }
        if (fromRecord.value) {
          fromRecord.value = false
        }
        // real-timeRecordsto record
        recordAnswer(props.question, [rate])
      }
    }
  }

  onMounted(() => {
    window.addEventListener('message', onMessage)
    document.addEventListener('fullscreenchange', onFullscreenChange)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    // ComponentUnmountwhenifstillFullscreen，Exit Fullscreen
    if (import.meta.client && document.fullscreenElement === containerRef.value) {
      document.exitFullscreen().catch(() => {})
    }
  })

  // listen record change（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    const rate = Number(record[0])
    if (!isNaN(rate)) {
      latestRate.value = rate
    }
  }, { immediate: true })

  function submit() {
    if (!props.question) return
    const rate = latestRate.value ?? 0
    const correct = rate >= 1
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [rate],
      isCorrect: correct,
      correctRate: rate,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    latestRate.value = null
    props.question.record = []
  }

  function fillCorrectAnswer() {
    // HTML questionNonemethodAutofillCorrectAnswer
    latestRate.value = 1
    recordAnswer(props.question, [1])
  }

  return {
    iframeRef,
    containerRef,
    isFullscreen,
    htmlContent,
    submitted,
    latestRate,
    hasAnswer,
    toggleFullscreen,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
