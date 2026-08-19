import { ref, watch, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { submitQuestion, recordAnswer } from './shared'

export function useSelect(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('questionSubmitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()
  const selectAnswers = ref<any[]>([])
  let selectEls: HTMLSelectElement[] = []

  // 找到当前题目区域下的所有 select 元素容器
  function getContainer(): Element | null {
    return document.querySelector(`[data-question-id="${props.questionId}"] .prose`)
  }

  // 收集 DOM 中所有 select 元素并绑定事件
  function bindSelects() {
    const container = getContainer()
    if (!container) return
    unbindSelects()
    selectEls = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[]
    selectEls.forEach((el, idx) => {
      el.dataset.fillIndex = String(idx)
      el.addEventListener('change', onChange)
    })
  }

  function unbindSelects() {
    selectEls.forEach(el => {
      el.removeEventListener('change', onChange)
    })
    selectEls = []
  }

  function onChange(e: Event) {
    const target = e.target as HTMLSelectElement
    const idx = Number(target.dataset.fillIndex)
    // 提交后重新作答，清除判断状态
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    clearSelectStyles()
    selectAnswers.value[idx] = target.value
    recordAnswer(props.question, selectAnswers.value.map((v: any) => (v || '').trim()))
  }

  onMounted(() => {
    setTimeout(bindSelects, 0)
  })

  // 初始化
  watch(() => props.question, (q: any) => {
    if (q?.type === 'select') {
      selectAnswers.value = (q.answer || []).map(() => '')
    }
  }, { immediate: true })

  // 监听 record 变化，同步到 selectAnswers 和 DOM（fetchRecord 回填场景）
  watch(() => props.question?.record, (record: any) => {
    if (!Array.isArray(record) || record.length === 0) return
    selectAnswers.value = [...record]
    // DOM 可能还未渲染，用 nextTick 确保已挂载
    nextTick(() => {
      const container = getContainer()
      if (!container) return
      const els = container.querySelectorAll('select')
      els.forEach((el, idx) => {
        if (record[idx] !== undefined) {
          ;(el as HTMLSelectElement).value = record[idx]
        }
      })
    })
  }, { immediate: true })

  const hasAnswer = computed(() => selectAnswers.value.some((a: any) => a && a.trim() !== ''))

  // submit 后给 select 着色：正确绿、错误红
  function styleSelects() {
    const container = getContainer()
    if (!container) return
    const els = container.querySelectorAll('select')
    const qAnswer = props.question.answer || []
    els.forEach((el, idx) => {
      const selectEl = el as HTMLSelectElement
      const userVal = (selectEl.value || '').trim()
      const correctVal = String(qAnswer[idx] || '').trim()
      if (userVal === correctVal) {
        selectEl.style.borderColor = '#4ade80'
        selectEl.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'
      } else {
        selectEl.style.borderColor = '#f87171'
        selectEl.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'
      }
    })
  }

  function clearSelectStyles() {
    const container = getContainer()
    if (!container) return
    container.querySelectorAll('select').forEach(el => {
      const selectEl = el as HTMLSelectElement
      selectEl.style.borderColor = ''
      selectEl.style.backgroundColor = ''
    })
  }

  watch(submitted, (val) => {
    if (!val) clearSelectStyles()
  })

  async function submit() {
    if (!props.question) return
    const container = getContainer()
    if (container) {
      const els = container.querySelectorAll('select')
      els.forEach((el, idx) => {
        selectAnswers.value[idx] = (el as HTMLSelectElement).value
      })
    }
    // 服务端判分（show 不下发答案，本地无法判定）
    const result = await submitQuestion({
      questionId: props.questionId,
      userAnswer: selectAnswers.value.map((a: any) => (a || '').trim()),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
      question: props.question,
    })
    if (!result) return null
    isCorrect.value = result.isCorrect
    // 答案已由响应合并进 question，着色依赖它
    styleSelects()
    return { isCorrect: result.isCorrect }
  }

  function reset() {
    selectAnswers.value = (props.question.answer || []).map(() => '')
    const container = getContainer()
    if (container) {
      container.querySelectorAll('select').forEach(el => { (el as HTMLSelectElement).value = '' })
    }
    clearSelectStyles()
    props.question.record = []
  }

  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      const container = getContainer()
      if (container) {
        const els = container.querySelectorAll('select')
        props.question.answer.forEach((ans: any, idx: number) => {
          if (els[idx]) {
            ;(els[idx] as HTMLSelectElement).value = ans
          }
        })
      }
      clearSelectStyles()
      props.question.record = [...props.question.answer]
    }
  }

  onBeforeUnmount(() => { unbindSelects() })

  return {
    hasAnswer,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
