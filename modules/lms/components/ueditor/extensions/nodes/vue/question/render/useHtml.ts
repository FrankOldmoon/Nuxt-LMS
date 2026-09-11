import { ref, computed, inject, watch, onMounted, onBeforeUnmount } from 'vue'
import { submitQuestion, recordAnswer } from './shared'
import { buildSrcdocWithHeightReport } from '../../html/buildSrcdoc'

export function useHtml(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  const iframeRef = ref(null)
  const containerRef = ref(null)
  const isFullscreen = ref(false)
  // 内容自适应高度（默认 300，由 iframe 内部上报实际高度）
  const iframeHeight = ref(300)

  // 全屏切换
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

  // HTML 内容：包裹为基础文档 + 高度上报脚本（自动上报实际高度）
  const htmlContent = computed(() => {
    const c = props.question.content
    if (typeof c === 'string') return buildSrcdocWithHeightReport(c)
    return ''
  })

  // iframe 传来的正确率
  const latestRate = ref(null)
  // 上一次收到的正确率，用于 detect 0→1 的跳变以自动提交（避免重复触发）
  let prevRate: number | null = null

  // 正确率不为 0 时才有可提交的内容：0 视为未答对，submit 保持不可用
  const hasAnswer = computed(() => latestRate.value !== null && latestRate.value > 0)

  // 监听 iframe message（通过 event.source 区分不同 iframe）
  function onMessage(event) {
    // 只处理来自当前 iframe 的消息
    if (event.source !== iframeRef.value?.contentWindow) return
    // 内容高度上报 → 自适应高度
    if (event.data && typeof event.data === 'object' && event.data.type === 'html-node-height') {
      const h = Number(event.data.height)
      if (!isNaN(h) && h > 0) iframeHeight.value = h
      return
    }
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
        // 实时记录到 record
        recordAnswer(props.question, [rate])
        // correct_rate=1 时自动提交（仅从非 1 变为 1 时触发一次）
        if (rate === 1 && prevRate !== 1) {
          submit()
        }
        prevRate = rate
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
    // 组件卸载时若仍在全屏，退出全屏
    if (import.meta.client && document.fullscreenElement === containerRef.value) {
      document.exitFullscreen().catch(() => {})
    }
  })

  // 监听 record 变化（fetchRecord 回填场景）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    const rate = Number(record[0])
    if (!isNaN(rate)) {
      latestRate.value = rate
    }
  }, { immediate: true })

  async function submit() {
    if (!props.question) return
    const rate = latestRate.value ?? 0
    // HTML 题由 iframe postMessage 判定，服务端透传该 rate
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: [rate],
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
      question: props.question,
    })
    if (!result) return null
    isCorrect.value = result.isCorrect
    return { isCorrect: result.isCorrect }
  }

  function reset() {
    latestRate.value = null
    prevRate = null
    props.question.record = []
  }

  function fillCorrectAnswer() {
    // HTML 题无法自动填充正确答案
    latestRate.value = 1
    recordAnswer(props.question, [1])
  }

  return {
    iframeRef,
    containerRef,
    isFullscreen,
    iframeHeight,
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
