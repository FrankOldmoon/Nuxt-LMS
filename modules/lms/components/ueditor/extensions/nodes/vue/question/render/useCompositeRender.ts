import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useCompositeRender(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // child question list（store question.content Middle）
  const sub-questions = computed(() => {
    return Array.isArray(props.question.content) ? props.question.content : []
  })

  const subRefs = ref([])
  const showAnswer = ref(false)

  // eachchild question record
  const subRecords = ref({})

  // prevent fillCorrectAnswer → setRecord → answer-change → syncRecord → record watcher → setRecord loop
  let isRestoring = false

  const hasAnswer = computed(() => {
    return Object.keys(subRecords.value).length > 0
  })

  // child questionAnswerchange
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

  // Syncto question.record
  function syncRecord() {
    const record = sub-questions.value.map((_, i) => subRecords.value[i] || [])
    recordAnswer(props.question, record)
  }

  // listen question.record change（fetchRecord backfill scenario / fillCorrectAnswer Trigger）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    // willeachitemschild question record SettingstoRightshould Sub-questionRenderer
    isRestoring = true
    nextTick(() => {
      record.forEach((subRecord, idx) => {
        if (Array.isArray(subRecord) && subRecord.length > 0) {
          subRefs.value[idx]?.setRecord(subRecord)
          subRecords.value[idx] = subRecord
        }
      })
      // backfillBackifFatherlevelalreadyYes submitted Status，child questionalsoShowjudge
      if (submitted.value) {
        subRefs.value.forEach(ref => ref?.applyJudgment?.())
      }
      nextTick(() => { isRestoring = false })
    })
  }, { immediate: true })

  // listen submitted change（reset scenario）
  watch(submitted, (val) => {
    if (!val) {
      showAnswer.value = false
      subRecords.value = {}
    }
  })

  function submit() {
    if (!props.question || !sub-questions.value.length) return
    // Calleachitemschild question submit
    const results = []
    subRefs.value.forEach(ref => {
      if (ref) {
        const result = ref.submit()
        if (result) results.push(result)
      }
    })
    // calculate total scoreandScore
    let totalPoint = 0
    let correctPoint = 0
    sub-questions.value.forEach((sub, i) => {
      const pt = Number(sub.point) || 0
      totalPoint += pt
      const subRecord = subRecords.value[i] || []
      const sub-question = { ...sub, record: subRecord }
      const rate = computeCorrectRate(sub-question)
      correctPoint += rate * pt
    })
    const correctRate = totalPoint > 0 ? correctPoint / totalPoint : 0
    const correct = correctRate >= 1 && results.length === sub-questions.value.length
    isCorrect.value = correct

    // Build complete record
    const fullRecord = sub-questions.value.map((_, i) => subRecords.value[i] || [])

    submitQuestion({
      questionId: props.questionId,
      userAnswer: fullRecord,
      isCorrect: correct,
      correctRate,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: totalPoint,
    })
    return { isCorrect: correct }
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
    sub-questions,
    subRefs,
    showAnswer,
    hasAnswer,
    onAnswerChange,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
