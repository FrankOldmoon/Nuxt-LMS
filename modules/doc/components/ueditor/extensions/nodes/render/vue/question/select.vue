<template>
  <div>
    <!-- select 题型：内容在父组件渲染（含 ::select 下拉框），此处无需模板 -->
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
const selectAnswers = ref([])
let selectEls = []

// 找到当前题目区域下的所有 select 元素容器
function getContainer() {
  return document.querySelector(`[data-question-id="${props.questionId}"] .prose`)
}

// 收集 DOM 中所有 select 元素并绑定事件
function bindSelects() {
  const container = getContainer()
  if (!container) return
  unbindSelects()
  selectEls = Array.from(container.querySelectorAll('select'))
  selectEls.forEach((el, idx) => {
    el.dataset.fillIndex = idx
    el.addEventListener('change', onChange)
  })
}

function unbindSelects() {
  selectEls.forEach(el => {
    el.removeEventListener('change', onChange)
  })
  selectEls = []
}

function onChange(e) {
  const idx = Number(e.target.dataset.fillIndex)
  // 提交后重新作答，清除判断状态
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  clearSelectStyles()
  selectAnswers.value[idx] = e.target.value
  recordAnswer(props.question, selectAnswers.value.map(v => (v || '').trim()))
}

onMounted(() => {
  setTimeout(bindSelects, 0)
})

// 初始化
watch(() => props.question, (q) => {
  if (q?.type === 'select') {
    selectAnswers.value = (q.answer || []).map(() => '')
  }
}, { immediate: true })

// 监听 record 变化，同步到 selectAnswers 和 DOM（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  selectAnswers.value = [...record]
  // DOM 可能还未渲染，用 nextTick 确保已挂载
  nextTick(() => {
    const container = getContainer()
    if (!container) return
    const els = container.querySelectorAll('select')
    els.forEach((el, idx) => {
      if (record[idx] !== undefined) {
        el.value = record[idx]
      }
    })
  })
}, { immediate: true })

const hasAnswer = computed(() => selectAnswers.value.some(a => a && a.trim() !== ''))

// submit 后给 select 着色：正确绿、错误红
function styleSelects() {
  const container = getContainer()
  if (!container) return
  const els = container.querySelectorAll('select')
  const qAnswer = props.question.answer || []
  els.forEach((el, idx) => {
    const userVal = (el.value || '').trim()
    const correctVal = String(qAnswer[idx] || '').trim()
    if (userVal === correctVal) {
      el.style.borderColor = '#4ade80'
      el.style.backgroundColor = 'rgba(74, 222, 128, 0.1)'
    } else {
      el.style.borderColor = '#f87171'
      el.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'
    }
  })
}

function clearSelectStyles() {
  const container = getContainer()
  if (!container) return
  container.querySelectorAll('select').forEach(el => {
    el.style.borderColor = ''
    el.style.backgroundColor = ''
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
      selectAnswers.value[idx] = el.value
    })
  }
  const qAnswer = props.question.answer || []
  const correct = qAnswer.length > 0 && qAnswer.every((ans, i) => {
    return (selectAnswers.value[i] || '').trim() === String(ans).trim()
  })
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: selectAnswers.value.map(a => (a || '').trim()),
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  styleSelects()
  return { isCorrect: correct }
}

function reset() {
  selectAnswers.value = (props.question.answer || []).map(() => '')
  const container = getContainer()
  if (container) {
    container.querySelectorAll('select').forEach(el => { el.value = '' })
  }
  clearSelectStyles()
  props.question.record = []
}

function fillCorrectAnswer() {
  if (props.question?.answer && props.question.answer.length > 0) {
    const container = getContainer()
    if (container) {
      const els = container.querySelectorAll('select')
      props.question.answer.forEach((ans, idx) => {
        if (els[idx]) {
          els[idx].value = ans
        }
      })
    }
    clearSelectStyles()
    props.question.record = [...props.question.answer]
  }
}

onBeforeUnmount(() => { unbindSelects() })

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
