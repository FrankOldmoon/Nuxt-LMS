import { ref, computed, inject, watch, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useSort(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  // dragList: [{ originalIndex: 2 }, { originalIndex: 0 }, ...] — driven vuedraggable
  const dragList = ref([])
  // prevent dragList watcher → recordAnswer → record watcher → dragList loop
  let isRecording = false
  // userOrder: from dragList derived originalStartIndexArray
  const userOrder = computed(() => dragList.value.map(item => item.originalIndex))

  const hasAnswer = computed(() => userOrder.value.length > 0)

  // Initialize：shuffleOrder
  function shuffle() {
    const options = props.question.options || []
    const indices = options.map((_, i) => i)
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    // avoid justGoodandCorrectOrdersame（Ifexceed1items）
    if (indices.length > 1 && indices.every((v, i) => v === i)) {
      ;[indices[0], indices[1]] = [indices[1], indices[0]]
    }
    dragList.value = indices.map(idx => ({ originalIndex: idx }))
  }

  // listen question when changesInitialize
  watch(() => props.question, (q) => {
    if (q?.type === 'sort' && Array.isArray(q.options) && q.options.length) {
      shuffle()
    }
  }, { immediate: true })

  // listen record change（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record) => {
    if (isRecording) return
    if (!Array.isArray(record) || record.length === 0) return
    dragList.value = record.map(idx => ({ originalIndex: idx }))
  }, { immediate: true })



  // dragList real-time when changesRecords
  watch(dragList, () => {
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    isRecording = true
    recordAnswer(props.question, [...userOrder.value])
    nextTick(() => { isRecording = false })
  }, { deep: true })

  function getItemText(originalIndex) {
    const opt = props.question.options?.[originalIndex]
    if (typeof opt === 'string') return opt
    return String(opt || '')
  }

  function itemClass(originalIndex) {
    if (!submitted.value) {
      return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
    }
    if (isCorrect.value) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    }
    // answerWrong：eachitemsPositionseparateColor
    const correctOrder = props.question.answer || []
    const currentPos = userOrder.value.indexOf(originalIndex)
    if (correctOrder[currentPos] === originalIndex) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    }
    return 'border-red-400 bg-red-50 dark:bg-red-900/20'
  }

  function submit() {
    if (!props.question || !userOrder.value.length) return
    const correctOrder = props.question.answer || []
    const correct = correctOrder.length === userOrder.value.length &&
      userOrder.value.every((idx, i) => idx === correctOrder[i])
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [...userOrder.value],
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    shuffle()
  }

  // fillCorrectAnswer
  function fillCorrectAnswer() {
    const correctOrder = props.question.answer || []
    if (correctOrder.length) {
      dragList.value = correctOrder.map(idx => ({ originalIndex: idx }))
      recordAnswer(props.question, [...correctOrder])
    }
  }

  return {
    dragList,
    submitted,
    isCorrect,
    hasAnswer,
    getItemText,
    itemClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
