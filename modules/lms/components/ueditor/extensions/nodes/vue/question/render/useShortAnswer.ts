import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useShortAnswer(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  const { courseId, chapterId } = useLmsContext()

  const userAnswer = ref('')
  const textareaRef = ref<any>(null)

  const hasAnswer = computed(() => userAnswer.value.trim() !== '')

  // 正确答案的正则表达式
  const correctPattern = computed(() => {
    const ans = props.question.answer || []
    return Array.isArray(ans) ? (ans[0] || '') : String(ans || '')
  })

  // 编译正则
  function compileRegex() {
    const pattern = correctPattern.value
    if (!pattern) return null
    try {
      return new RegExp(pattern)
    } catch {
      return null
    }
  }

  // 监听 question 变化
  watch(() => props.question, () => {
    userAnswer.value = ''
  }, { immediate: true })

  // 监听 record 变化（fetchRecord 回填场景）
  watch(() => props.question?.record, (record) => {
    if (!Array.isArray(record) || record.length === 0) return
    userAnswer.value = String(record[0] || '')
  }, { immediate: true })

  function onInput() {
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    recordAnswer(props.question, [userAnswer.value])
  }

  const inputClass = computed(() => {
    if (!submitted.value) return ''
    if (isCorrect.value) {
      return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    }
    return 'border-red-400 bg-red-50 dark:bg-red-900/20'
  })

  function submit() {
    if (!props.question) return
    const re = compileRegex()
    const correct = re ? re.test(userAnswer.value.trim()) : false
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: [userAnswer.value.trim()],
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    return { isCorrect: correct }
  }

  function reset() {
    userAnswer.value = ''
    props.question.record = []
  }

  function fillCorrectAnswer() {
    // 简答题无法自动填充正确答案，只展示正则
    // 用能匹配正则的示例文本（如 "abc"）作为提示
    const re = compileRegex()
    if (re) {
      userAnswer.value = ''
      recordAnswer(props.question, [''])
    }
  }

  return {
    submitted,
    isCorrect,
    userAnswer,
    textareaRef,
    hasAnswer,
    correctPattern,
    inputClass,
    onInput,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
