import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useSingle(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()
  const selected = ref(-1)

  const hasAnswer = computed(() => selected.value >= 0)

  // 监听 question.record 变化，同步到 selected
  watch(() => props.question?.record, (record) => {
    if (record && record.length > 0) {
      selected.value = record[0]
    }
  }, { immediate: true })

  function select(idx: number) {
    // 提交后重新作答，清除判断状态
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    selected.value = idx
    recordAnswer(props.question, [idx])
  }

  function optionClass(idx: number) {
    if (submitted.value) {
      if (isCorrect.value) {
        // 答对：选中项标绿
        if (selected.value === idx) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
        return 'border-gray-200 dark:border-gray-600'
      } else {
        // 答错：只标红用户选错的项，不标绿正确答案
        if (selected.value === idx) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
        return 'border-gray-200 dark:border-gray-600'
      }
    }
    return selected.value === idx
      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
  }

  function dotClass(idx: number) {
    if (submitted.value) {
      if (isCorrect.value) {
        if (selected.value === idx) return 'border-green-400 text-green-500'
        return 'border-gray-300 dark:border-gray-500'
      } else {
        if (selected.value === idx) return 'border-red-400 text-red-500'
        return 'border-gray-300 dark:border-gray-500'
      }
    }
    return selected.value === idx
      ? 'border-blue-400 text-blue-500'
      : 'border-gray-300 dark:border-gray-500'
  }

  function submit() {
    if (!props.question || selected.value < 0) return
    const correct = selected.value === props.question.answer[0]
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [selected.value],
      isCorrect: correct,
      correctRate: correct ? 1 : 0,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    selected.value = -1
    props.question.record = []
  }

  // 填充正确答案为 record
  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      selected.value = props.question.answer[0]
      props.question.record = [props.question.answer[0]]
    }
  }

  return {
    selected,
    hasAnswer,
    select,
    optionClass,
    dotClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
