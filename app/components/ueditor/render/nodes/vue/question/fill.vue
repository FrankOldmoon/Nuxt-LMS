<template>
  <div>
    <!-- 填空题型：内容在父组件渲染，此处无需模板 -->
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, inject } from 'vue'
import { submitQuestion, recordAnswer } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
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

const hasAnswer = computed(() => fillAnswers.value.some(a => a && a.trim() !== ''))

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
  const correct = qAnswer.length > 0 && qAnswer.every((ans, i) => {
    return (fillAnswers.value[i] || '').trim() === String(ans).trim()
  })
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: fillAnswers.value.map(a => (a || '').trim()),
    isCorrect: correct,
  })
  return { isCorrect: correct }
}

function reset() {
  fillAnswers.value = (props.question.answer || []).map(() => '')
  const container = getInputContainer()
  if (container) {
    container.querySelectorAll('input').forEach(el => { el.value = '' })
  }
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
    props.question.record = [...props.question.answer]
  }
}

onBeforeUnmount(() => { unbindInputs() })

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
