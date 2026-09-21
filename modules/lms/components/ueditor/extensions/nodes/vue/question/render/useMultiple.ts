import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, getShuffledOptionOrder, getOriginalOptionOrder } from './shared'

export function useMultiple(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')
  // 「显示答案」状态（useQuestionRender / useSubQuestion 提供）
  const showAnswer = inject<import('vue').Ref<boolean> | null>('questionShowAnswer', null)
  const { courseId, chapterId } = useLmsContext()
  const selected = ref<number[]>([])

  // 选项展示顺序（原始下标数组）；selected/record 始终存原始下标。
  // 显示答案时回到原始顺序（A/B/C/D），便于与答案字母对照；其余情况随机展示。
  const optionOrder = computed(() => (
    showAnswer?.value ? getOriginalOptionOrder(props.question) : getShuffledOptionOrder(props.question)
  ))
  // 展示位置字母：按展示顺序 A/B/C/D...
  function optionLabel(pos: number) {
    return String.fromCharCode(65 + pos)
  }

  const hasAnswer = computed(() => selected.value.length > 0)

  // 监听 question.record 变化，同步到 selected
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
        // 答对：选中项标绿
        if (sel) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
        return 'border-gray-200 dark:border-gray-600'
      } else {
        // 答错：只标红用户选错的项，不标绿/黄正确答案
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

  async function submit() {
    if (!props.question || !selected.value.length) return
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: [...selected.value],
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
    selected.value = []
    props.question.record = []
  }

  // 填充正确答案为 record
  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      selected.value = [...props.question.answer]
      props.question.record = [...props.question.answer]
    }
  }

  return {
    selected,
    optionOrder,
    optionLabel,
    hasAnswer,
    toggle,
    optionClass,
    checkClass,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
