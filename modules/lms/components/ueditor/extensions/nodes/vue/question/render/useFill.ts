import { ref, watch, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared'

export function useFill(props: any) {
  const submitted = inject<import('vue').Ref<boolean>>('question submitted')!
  const isCorrect = inject<import('vue').Ref<boolean>>('questionIsCorrect')!
  const fromRecord = inject<import('vue').Ref<boolean>>('questionFromRecord')!
  const { courseId, chapterId } = useLmsContext()
  const fillAnswers = ref<any[]>([])
  let inputEls: HTMLInputElement[] = []

  // findtoCurrentQuestionareaDownAll input frame
  function getInputContainer(): Element | null {
    return document.querySelector(`[data-question-id="${props.questionId}"] .prose`)
  }

  // collect DOM MiddleAll input frameandbindEvent
  function bindInputs() {
    const container = getInputContainer()
    if (!container) return
    unbindInputs()
    inputEls = Array.from(container.querySelectorAll('input')) as HTMLInputElement[]
    inputEls.forEach((el, idx) => {
      el.dataset.fillIndex = String(idx)
      el.addEventListener('input', onInput)
    })
  }

  function unbindInputs() {
    inputEls.forEach(el => {
      el.removeEventListener('input', onInput)
    })
    inputEls = []
  }

  function onInput(e: Event) {
    const target = e.target as HTMLInputElement
    const idx = Number(target.dataset.fillIndex)
    // SubmitBackHeavyNewanswer，ClearjudgeStatus
    if (submitted.value) {
      submitted.value = false
    }
    if (fromRecord.value) {
      fromRecord.value = false
    }
    clearInputStyles()
    fillAnswers.value[idx] = target.value
    recordAnswer(props.question, fillAnswers.value.map((v: any) => (v || '').trim()))
  }

  onMounted(() => {
    setTimeout(bindInputs, 0)
  })

  // InitializefillEmptyAnswer
  watch(() => props.question, (q: any) => {
    if (q?.type === 'fill') {
      fillAnswers.value = (q.answer || []).map(() => '')
    }
  }, { immediate: true })

  // listen record change，Syncto fillAnswers and DOM（fetchRecord backfill scenario）
  watch(() => props.question?.record, (record: any) => {
    if (!Array.isArray(record) || record.length === 0) return
    fillAnswers.value = [...record]
    // DOM cancanalsonotRender，use nextTick ensurealreadyMount
    nextTick(() => {
      const container = getInputContainer()
      if (!container) return
      const inputs = container.querySelectorAll('input')
      inputs.forEach((el, idx) => {
        if (record[idx] !== undefined) {
          ;(el as HTMLInputElement).value = record[idx]
        }
      })
    })
  }, { immediate: true })

  const hasAnswer = computed(() => fillAnswers.value.some((a: any) => {
    const s = (a ?? '').toString()
    return s && s.trim() !== ''
  }))

  // submit BacktoInput BoxColor：CorrectGreen、ErrorRed（support regex match ing）
  function styleInputs() {
    const container = getInputContainer()
    if (!container) return
    const inputs = container.querySelectorAll('input')
    const qAnswer = props.question.answer || []
    const qOptions = props.question.options || []
    inputs.forEach((el, idx) => {
      const inputEl = el as HTMLInputElement
      const userVal = (inputEl.value || '').trim()
      const correctVal = String(qAnswer[idx] || '').trim()
      const isRegex = qOptions[idx] === 'regex'
      let correct = false
      if (isRegex) {
        try {
          correct = new RegExp(correctVal).test(userVal)
        } catch {
          correct = false
        }
      } else {
        correct = userVal === correctVal
      }
      if (correct) {
        inputEl.style.borderColor = '#4ade80'
        inputEl.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'
      } else {
        inputEl.style.borderColor = '#f87171'
        inputEl.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'
      }
    })
  }

  // ClearInput BoxColor
  function clearInputStyles() {
    const container = getInputContainer()
    if (!container) return
    container.querySelectorAll('input').forEach(el => {
      const inputEl = el as HTMLInputElement
      inputEl.style.borderColor = ''
      inputEl.style.backgroundColor = ''
    })
  }

  // submitted change false whenClearColor（reset scenario）
  watch(submitted, (val) => {
    if (!val) clearInputStyles()
  })

  function submit() {
    if (!props.question) return
    // SubmitFrontfrom DOM collectLatestValue
    const container = getInputContainer()
    if (container) {
      const inputs = container.querySelectorAll('input')
      inputs.forEach((el, idx) => {
        fillAnswers.value[idx] = (el as HTMLInputElement).value
      })
    }
    const qAnswer = props.question.answer || []
    const qOptions = props.question.options || []
    const correct = qAnswer.length > 0 && qAnswer.every((ans: any, i: number) => {
      const userVal = (fillAnswers.value[i] || '').trim()
      const correctVal = String(ans).trim()
      // support regex match ing
      if (qOptions[i] === 'regex') {
        try {
          return new RegExp(correctVal).test(userVal)
        } catch {
          return false
        }
      }
      return userVal === correctVal
    })
    isCorrect.value = correct
    submitQuestion({
      questionId: props.questionId,
      userAnswer: fillAnswers.value.map((a: any) => (a || '').trim()),
      isCorrect: correct,
      correctRate: computeCorrectRate(props.question),
      courseId: courseId.value,
      chapterId: chapterId.value,
      point: props.question.point,
    })
    styleInputs()
    return { isCorrect: correct }
  }

  function reset() {
    fillAnswers.value = (props.question.answer || []).map(() => '')
    const container = getInputContainer()
    if (container) {
      container.querySelectorAll('input').forEach(el => { (el as HTMLInputElement).value = '' })
    }
    clearInputStyles()
    props.question.record = []
  }

  // fillCorrectAnswer record
  function fillCorrectAnswer() {
    if (props.question?.answer && props.question.answer.length > 0) {
      const container = getInputContainer()
      if (container) {
        const inputs = container.querySelectorAll('input')
        props.question.answer.forEach((ans: any, idx: number) => {
          if (inputs[idx]) {
            ;(inputs[idx] as HTMLInputElement).value = ans
          }
        })
      }
      clearInputStyles()
      props.question.record = [...props.question.answer]
    }
  }

  onBeforeUnmount(() => { unbindInputs() })

  return {
    hasAnswer,
    submit,
    reset,
    fillCorrectAnswer,
  }
}
