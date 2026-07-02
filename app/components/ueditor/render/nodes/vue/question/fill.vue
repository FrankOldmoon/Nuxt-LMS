<template>
  <div>
    <!-- 提交/重置 -->
    <div v-if="!submitted" class="flex justify-end gap-2 pt-3">
      <UButton variant="soft" size="sm" :disabled="!hasAnswer" @click="reset">
        {{ $t('common.reset') }}
      </UButton>
      <UButton color="primary" size="sm" :disabled="!hasAnswer" @click="submit">
        {{ $t('question.submit') }}
      </UButton>
    </div>

    <!-- 结果 -->
    <div v-if="submitted" class="mt-4 space-y-3">
      <ResultBanner :correct="isCorrect" :point="question.point" />
      <ExplanationBlock :explanation="question.explanation" />
      <div class="flex justify-end">
        <UButton variant="soft" size="sm" @click="redo">{{ $t('question.redo') }}</UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import ResultBanner from './result-banner.vue'
import ExplanationBlock from './explanation-block.vue'
import { submitQuestion, recordAnswer, contentToText } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = ref(false)
const isCorrect = ref(false)
const fillAnswers = ref([])

// 初始化填空答案
watch(() => props.question, (q) => {
  if (q?.type === 'fill') {
    fillAnswers.value = (q.answer || []).map(() => '')
  }
}, { immediate: true })

const hasAnswer = computed(() => fillAnswers.value.some(a => a.trim() !== ''))

// 内容分段（解析 {{n}} 占位符）
const fillSegments = computed(() => {
  if (!props.question || props.question.type !== 'fill') return []
  const text = contentToText(props.question.content)
  const segments = []
  const re = /\{\{(\d+)\}\}/g
  let lastIndex = 0
  let match
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), index: null })
    }
    segments.push({ text: '', index: Number(match[1]) })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), index: null })
  }
  return segments
})

function inputClass(idx) {
  if (!submitted.value) return ''
  const userAns = (fillAnswers.value[idx] || '').trim()
  const correctAns = String(props.question.answer[idx] || '').trim()
  return userAns === correctAns
    ? 'border-green-400 bg-green-50 dark:bg-green-900/30'
    : 'border-red-400 bg-red-50 dark:bg-red-900/30'
}

// 输入框内容变化时实时记录
function onInput() {
  recordAnswer(props.question, fillAnswers.value.map(a => a.trim()))
}

async function submit() {
  if (!props.question) return
  const qAnswer = props.question.answer || []
  isCorrect.value = qAnswer.length > 0 && qAnswer.every((ans, i) => {
    return (fillAnswers.value[i] || '').trim() === String(ans).trim()
  })
  submitted.value = true
  await submitQuestion({
    questionId: props.questionId,
    userAnswer: fillAnswers.value.map(a => a.trim()),
    isCorrect: isCorrect.value,
  })
}

function reset() {
  submitted.value = false
  fillAnswers.value = (props.question.answer || []).map(() => '')
}

function redo() { reset() }
</script>
