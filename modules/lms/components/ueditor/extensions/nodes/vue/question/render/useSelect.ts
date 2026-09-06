import { ref, watch, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { submitQuestion, recordAnswer } from './shared'
import { getSelectBindings, getSelectRevision } from './selectStore'

export function useSelect(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()
  const selectAnswers = ref<any[]>([])
  const qid = Number(props.questionId)

  // revision 建立响应式依赖：下拉框新增/卸载时 bindings 列表会变化；
  // binding 里的 value 是独立 ref，解包/取值不受影响
  const bindings = computed(() => {
    getSelectRevision().value // eslint-disable-line no-unused-expressions
    return getSelectBindings(qid)
  })

  function currentValues(): string[] {
    return bindings.value.map((b) => (b.value.value || '').trim())
  }

  // 用户选择/重置/回填任一变化 → 清除已提交状态并记录当前作答
  // applying 用于区分"程序回填"和"用户点选"，避免回填时重复 record
  let applying = false
  watch(
    () => {
      getSelectRevision().value // 成员增减也要触发重算
      return bindings.value.map((b) => b.value.value)
    },
    () => {
      if (applying) return
      const vals = currentValues()
      // 空值（下拉框刚挂载/全被清空）不触发 record，避免挂载即提交空答案
      if (vals.every((v) => v === '')) return
      if (submitted.value) submitted.value = false
      if (fromRecord.value) fromRecord.value = false
      clearSelectStyles()
      selectAnswers.value = vals
      recordAnswer(props.question, vals)
    },
  )

  // 初始化
  watch(() => props.question, (q: any) => {
    if (q?.type === 'select') {
      selectAnswers.value = (q.answer || []).map(() => '')
    }
  }, { immediate: true })

  // 回填 record（fetchRecord 场景 + 初始加载）：设置值但不触发 record 上报
  function applyRecord() {
    const record = props.question?.record
    if (!Array.isArray(record) || record.length === 0) return
    applying = true
    selectAnswers.value = [...record]
    bindings.value.forEach((b, idx) => {
      if (record[idx] !== undefined) b.value.value = String(record[idx])
    })
    nextTick(() => { applying = false })
  }
  watch(() => props.question?.record, applyRecord, { immediate: true })
  onMounted(() => { setTimeout(applyRecord, 0) })

  const hasAnswer = computed(() => selectAnswers.value.some((a: any) => a && (a || '').trim() !== ''))

  // submit 后给下拉框着色：正确绿、错误红
  function styleSelects() {
    const qAnswer = props.question.answer || []
    bindings.value.forEach((b, idx) => {
      const userVal = (b.value.value || '').trim()
      const correctVal = String(qAnswer[idx] || '').trim()
      b.mark(userVal === correctVal ? 'correct' : 'wrong')
    })
  }

  function clearSelectStyles() {
    bindings.value.forEach((b) => b.mark(''))
  }

  watch(submitted, (val) => {
    if (!val) clearSelectStyles()
  })

  async function submit() {
    if (!props.question) return
    selectAnswers.value = currentValues()
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: selectAnswers.value,
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
      question: props.question,
    })
    if (!result) return null
    isCorrect.value = result.isCorrect
    styleSelects()
    return { isCorrect: result.isCorrect }
  }

  function reset() {
    selectAnswers.value = (props.question.answer || []).map(() => '')
    applying = true
    bindings.value.forEach((b) => { b.value.value = '' })
    nextTick(() => { applying = false })
    clearSelectStyles()
    props.question.record = []
  }

  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      applying = true
      props.question.answer.forEach((ans: any, idx: number) => {
        if (bindings.value[idx]) bindings.value[idx].value.value = String(ans)
      })
      nextTick(() => { applying = false })
      clearSelectStyles()
      props.question.record = [...props.question.answer]
    }
  }

  onBeforeUnmount(() => {})

  return {
    hasAnswer,
    submit,
    reset,
    fillCorrectAnswer,
  }
}