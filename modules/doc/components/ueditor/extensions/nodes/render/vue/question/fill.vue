<template>
  <div>
    <!-- 填空题型：内容在父组件渲染，此处无需模板 -->
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, inject, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()
const fillAnswers = ref([])
let inputEls = []

// 找到当前题目区域下的所有 input 框
function getInputContainer() {
  return document.querySelector(`[data-question-id="${props.questionId}"] .prose`)
}

// 收集 DOM 中所有 input 框并绑定事件
function bindInputs() {
  const container = getInputContainer()
  if (!container) return
  unbindInputs()
  inputEls = container.querySelectorAll('input')
  inputEls.forEach((el, idx) => {
    el.dataset.fillIndex = idx
    el.addEventListener('input', onInput)
  })
}

function unbindInputs() {
  inputEls.forEach(el => {
    el.removeEventListener('input', onInput)
  })
  inputEls = []
}

function onInput(e) {
  const idx = Number(e.target.dataset.fillIndex)
  // 提交后重新作答，清除判断状态
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  clearInputStyles()
  fillAnswers.value[idx] = e.target.value
  recordAnswer(props.question, fillAnswers.value.map(v => (v || '').trim()))
}

onMounted(() => {
  setTimeout(bindInputs, 0)
})

// 初始化填空答案
watch(() => props.question, (q) => {
  if (q?.type === 'fill') {
    fillAnswers.value = (q.answer || []).map(() => '')
  }
}, { immediate: true })

// 监听 record 变化，同步到 fillAnswers 和 DOM（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  fillAnswers.value = [...record]
  // DOM 可能还未渲染，用 nextTick 确保已挂载
  nextTick(() => {
    const container = getInputContainer()
    if (!container) return
    const inputs = container.querySelectorAll('input')
    inputs.forEach((el, idx) => {
      if (record[idx] !== undefined) {
        el.value = record[idx]
      }
    })
  })
}, { immediate: true })

const hasAnswer = computed(() => fillAnswers.value.some((a) => {
  a = a.toString()
  return a && a.trim() !== ''
}
))

// submit 后给输入框着色：正确绿、错误红（支持正则匹配）
function styleInputs() {
  const container = getInputContainer()
  if (!container) return
  const inputs = container.querySelectorAll('input')
  const qAnswer = props.question.answer || []
  const qOptions = props.question.options || []
  inputs.forEach((el, idx) => {
    const userVal = (el.value || '').trim()
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
      el.style.borderColor = '#4ade80'
      el.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'
    } else {
      el.style.borderColor = '#f87171'
      el.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'
    }
  })
}

// 清除输入框着色
function clearInputStyles() {
  const container = getInputContainer()
  if (!container) return
  container.querySelectorAll('input').forEach(el => {
    el.style.borderColor = ''
    el.style.backgroundColor = ''
  })
}

// submitted 变为 false 时清除着色（reset 场景）
watch(submitted, (val) => {
  if (!val) clearInputStyles()
})

function submit() {
  if (!props.question) return
  // 提交前从 DOM 收集最新值
  const container = getInputContainer()
  if (container) {
    const inputs = container.querySelectorAll('input')
    inputs.forEach((el, idx) => {
      fillAnswers.value[idx] = el.value
    })
  }
  const qAnswer = props.question.answer || []
  const qOptions = props.question.options || []
  const correct = qAnswer.length > 0 && qAnswer.every((ans, i) => {
    const userVal = (fillAnswers.value[i] || '').trim()
    const correctVal = String(ans).trim()
    // 支持正则表达式匹配
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
    userAnswer: fillAnswers.value.map(a => (a || '').trim()),
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  styleInputs()
  return { isCorrect: correct }
}

function reset() {
  fillAnswers.value = (props.question.answer || []).map(() => '')
  const container = getInputContainer()
  if (container) {
    container.querySelectorAll('input').forEach(el => { el.value = '' })
  }
  clearInputStyles()
  props.question.record = []
}

// 填充正确答案为 record
function fillCorrectAnswer() {
  if (props.question?.answer && props.question.answer.length > 0) {
    const container = getInputContainer()
    if (container) {
      const inputs = container.querySelectorAll('input')
      props.question.answer.forEach((ans, idx) => {
        if (inputs[idx]) {
          inputs[idx].value = ans
        }
      })
    }
    clearInputStyles()
    props.question.record = [...props.question.answer]
  }
}

onBeforeUnmount(() => { unbindInputs() })

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
