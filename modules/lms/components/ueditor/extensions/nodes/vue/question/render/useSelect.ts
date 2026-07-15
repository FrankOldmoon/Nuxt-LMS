import { ref, watch, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useSelect(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()
  const selectAnswers = ref<any[]>([])
  let selectEls: HTMLSelectElement[] = []

  // findtoCurrentQuestionareaDownAll select element container
  function getContainer(): Element | null {
    return document.querySelector(`[data-question-id="${props.questionId}"] .prose`)
  }

  // collect DOM MiddleAll select elementandbindEvent
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
    // SubmitBackHeavyNewanswer，ClearjudgeStatus
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

  // Initialize
  watch(() => props.question, (q: any) => {
    if (q?.type === 'select') {
      selectAnswers.value = (q.answer || []).map(() => '')
    }
  }, { immediate: true })

  // listen record change，Syncto selectAnswers and DOM（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record: any) => {
    if (!Array.isArray(record) || record.length === 0) return
    selectAnswers.value = [...record]
    // DOM cancanalsonotRender，use nextTick ensurealreadyMount
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

  // submit Backto select Color：CorrectGreen、ErrorRed
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

  function submit() {
    if (!props.question) return
    const container = getContainer()
    if (container) {
      const els = container.querySelectorAll('select')
      els.forEach((el, idx) => {
        selectAnswers.value[idx] = (el as HTMLSelectElement).value
      })
    }
    const qAnswer = props.question.answer || []
    const correct = qAnswer.length > 0 && qAnswer.every((ans: any, i: number) => {
      return (selectAnswers.value[i] || '').trim() === String(ans).trim()
    })
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: selectAnswers.value.map((a: any) => (a || '').trim()),
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    styleSelects()
    return { isCorrect: correct }
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
