import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useMultiple(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()
  const selected = ref<number[]>([])

  const hasAnswer = computed(() => selected.value.length > 0)

  // listen question.record change，Syncto selected
  watch(() => props.question?.record, (record) => {
    if (record && record.length > 0) {
      selected.value = [...record]
    }
  }, { immediate: true })

  function toggle(idx: number) {
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    const arr = [...selected.value]
    const pos = arr.indexOf(idx)
    if (pos > -1) arr.splice(pos, 1)
    else arr.push(idx)
    selected.value = arr
    recordAnswer(props.question, [...selected.value])
  }

  function optionClass(idx: number) {
    if (submitted.value) {
      const sel = selected.value.includes(idx)
      if (isCorrect.value) {
        // answerRight：SelecteditemsmarkGreen
        if (sel) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
        return 'border-gray-200 dark:border-gray-600'
      } else {
        // answerWrong：onlymarkRedUseroptionWrongitems，no markGreen/YellowCorrectAnswer
        if (sel) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
        return 'border-gray-200 dark:border-gray-600'
      }
    }
    return selected.value.includes(idx)
      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
  }

  function checkClass(idx: number) {
    if (submitted.value) {
      const sel = selected.value.includes(idx)
      if (isCorrect.value) {
        if (sel) return 'border-green-400 bg-green-400 text-white'
        return 'border-gray-300 dark:border-gray-500'
      } else {
        if (sel) return 'border-red-400 bg-red-400 text-white'
        return 'border-gray-300 dark:border-gray-500'
      }
    }
    return selected.value.includes(idx)
      ? 'border-blue-400 bg-blue-400 text-white'
      : 'border-gray-300 dark:border-gray-500 hover:border-blue-300'
  }

  function submit() {
    if (!props.question || !selected.value.length) return
    const sortedUser = [...selected.value].sort((a, b) => a - b)
    const sortedCorrect = [...props.question.answer].sort((a, b) => a - b)
    const correct = sortedUser.length === sortedCorrect.length && sortedUser.every((v, i) => v === sortedCorrect[i])
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [...selected.value],
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    selected.value = []
    props.question.record = []
  }

  // fillCorrectAnswer record
  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      selected.value = [...props.question.answer]
      props.question.record = [...props.question.answer]
    }
  }

  return {
    selected,
    hasAnswer,
    toggle,
    option Class,
    checkClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
