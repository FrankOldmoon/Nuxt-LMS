<template>
  <div>
    <!-- 填空区域 -->
    <div class="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
      <template v-for="(seg, si) in fillSegments" :key="si">
        <span>{{ seg.text }}</span>
        <input
          v-if="seg.index !== null"
          v-model="fillAnswers[seg.index]"
          :disabled="submitted"
          class="inline-block px-2 py-0.5 border-b-2 border-blue-400 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500 outline-none text-center min-w-[4rem] mx-1 rounded"
          :class="inputClass(seg.index)"
          :placeholder="$t('question.fillPlaceholder', { 0: seg.index + 1 })"
        />
      </template>
    </div>

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
      <div v-if="!isCorrect" class="text-sm text-gray-600 dark:text-gray-400">
        <span class="font-medium">{{ $t('question.correctAnswerLabel') }}</span>
        <span v-for="(ans, ai) in question.answer" :key="ai"
          class="inline-block px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded mx-0.5">
          {{ ans }}
        </span>
      </div>
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

async function submit() {
  if (!props.question) return
  const qAnswer = props.question.answer || []
  isCorrect.value = qAnswer.length > 0 && qAnswer.every((ans, i) => {
    return (fillAnswers.value[i] || '').trim() === String(ans).trim()
  })
  submitted.value = true
  try {
    await cRequest('/api/lms/questions/submit', {
      method: 'POST',
      body: {
        question_id: props.questionId,
        user_answer: fillAnswers.value.map(a => a.trim()),
        is_correct: isCorrect.value,
      },
    })
  } catch { /* 接口暂未实现 */ }
}

function reset() {
  submitted.value = false
  fillAnswers.value = (props.question.answer || []).map(() => '')
}

function redo() { reset() }

function contentToText(content) {
  if (typeof content === 'string') return content
  if (content && typeof content === 'object') return extractText(content)
  return ''
}
function extractText(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.text) return node.text
  if (node.content && Array.isArray(node.content)) return node.content.map(extractText).join('')
  return ''
}
</script>
