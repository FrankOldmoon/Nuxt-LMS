import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useCompositeRender(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // 子题列表（存储在 question.content 中）
  const subQuestions = computed(() => {
    return Array.isArray(props.question.content) ? props.question.content : []
  })

  const subRefs = ref([])
  const showAnswer = ref(false)

  // 各子题的 record
  const subRecords = ref({})

  // 防止 fillCorrectAnswer → setRecord → answer-change → syncRecord → record watcher → setRecord 循环
  let isRestoring = false

  const hasAnswer = computed(() => {
    return Object.keys(subRecords.value).length > 0
  })

  // 子题答案变化
  function onAnswerChange(idx, record) {
    subRecords.value[idx] = record
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    if (!isRestoring) {
      syncRecord()
    }
  }

  // 同步到 question.record
  function syncRecord() {
    const record = subQuestions.value.map((_, i) => subRecords.value[i] || [])
    recordAnswer(props.question, record)
  }

  // 监听 question.record 变化（fetchRecord 回填场景 / fillCorrectAnswer 触发）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    // 将每个子题的 record 设置到对应的 SubQuestionRenderer
    isRestoring = true
    nextTick(() => {
      record.forEach((subRecord, idx) => {
        if (Array.isArray(subRecord) && subRecord.length > 0) {
          subRefs.value[idx]?.setRecord(subRecord)
          subRecords.value[idx] = subRecord
        }
      })
      // 回填后若父级已是 submitted 状态，子题也显示判断
      if (submitted.value) {
        subRefs.value.forEach(ref => ref?.applyJudgment?.())
      }
      nextTick(() => { isRestoring = false })
    })
  }, { immediate: true })

  // 监听 submitted 变化（reset 场景）
  watch(submitted, (val) => {
    if (!val) {
      showAnswer.value = false
      subRecords.value = {}
    }
  })

  async function submit() {
    if (!props.question || !subQuestions.value.length) return
    // 先收集子题作答（必须在服务端响应合并 content 重渲染之前）
    const fullRecord = subQuestions.value.map((_, i) => subRecords.value[i] || [])
    const totalPoint = subQuestions.value.reduce((sum: number, sub: any) => sum + (Number(sub.point) || 0), 0)

    // 服务端判分（show 不下发子题答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: fullRecord,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: totalPoint,
      question: props.question,
    })
    if (!result) return null
    isCorrect.value = result.isCorrect

    // 响应携带完整 content（子题含 answer），子题组件重建后回填作答与对错
    nextTick(() => {
      subQuestions.value.forEach((_, i) => {
        subRefs.value[i]?.setRecord(fullRecord[i] || [])
      })
    })
    return { isCorrect: result.isCorrect }
  }

  function reset() {
    showAnswer.value = false
    subRecords.value = {}
    props.question.record = []
    subRefs.value.forEach(ref => ref?.reset?.())
  }

  function fillCorrectAnswer() {
    showAnswer.value = true
    subRefs.value.forEach(ref => {
      ref?.fillCorrectAnswer()
    })
  }

  return {
    subQuestions,
    subRefs,
    showAnswer,
    hasAnswer,
    onAnswerChange,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
