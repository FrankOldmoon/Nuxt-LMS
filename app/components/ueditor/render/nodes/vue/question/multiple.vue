<template>
  <div>
    <!-- 选项列表 -->
    <div class="space-y-2">
      <label
        v-for="(opt, idx) in question.options"
        :key="idx"
        class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
        :class="optionClass(idx)"
        @click="toggle(idx)"
      >
        <span class="shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors"
          :class="checkClass(idx)">
          <span v-if="selected.includes(idx)" class="text-xs">✓</span>
        </span>
        <span class="flex-1 text-sm">
          <ueditorRender v-if="isRichDoc(opt)" :json="opt" />
          <span v-else>{{ contentToText(opt) }}</span>
        </span>
      </label>
    </div>

    <!-- 提交/重置 -->
    <div v-if="!submitted" class="flex justify-end gap-2 pt-3">
      <UButton variant="soft" size="sm" :disabled="!selected.length" @click="reset">
        {{ $t('common.reset') }}
      </UButton>
      <UButton color="primary" size="sm" :disabled="!selected.length" @click="submit">
        {{ $t('question.submit') }}
      </UButton>
    </div>

    <!-- 结果 -->
    <div v-if="submitted" class="mt-4 space-y-3">
      <ResultBanner :correct="isCorrect" :point="question.point" />
      <div v-if="!isCorrect" class="text-sm text-gray-600 dark:text-gray-400">
        <span class="font-medium">{{ $t('question.correctAnswerLabel') }}</span>
        <span v-for="(ansIdx, ai) in question.answer" :key="ai">
          <span v-if="ai > 0">、</span>
          <span class="font-medium">{{ getOptionLabel(ansIdx) }}</span>
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

const selected = ref([])
const submitted = ref(false)
const isCorrect = ref(false)

function toggle(idx) {
  if (submitted.value) return
  const arr = [...selected.value]
  const pos = arr.indexOf(idx)
  if (pos > -1) arr.splice(pos, 1)
  else arr.push(idx)
  selected.value = arr
}

function optionClass(idx) {
  if (submitted.value) {
    const correct = props.question.answer.includes(idx)
    const sel = selected.value.includes(idx)
    if (correct && sel) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    if (correct && !sel) return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    if (!correct && sel) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
    return 'border-gray-200 dark:border-gray-600'
  }
  return selected.value.includes(idx)
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
}

function checkClass(idx) {
  if (submitted.value) {
    const correct = props.question.answer.includes(idx)
    const sel = selected.value.includes(idx)
    if (correct && sel) return 'border-green-400 bg-green-400 text-white'
    if (correct && !sel) return 'border-yellow-400 bg-yellow-100 text-yellow-600'
    if (!correct && sel) return 'border-red-400 bg-red-400 text-white'
    return 'border-gray-300 dark:border-gray-500'
  }
  return selected.value.includes(idx)
    ? 'border-blue-400 bg-blue-400 text-white'
    : 'border-gray-300 dark:border-gray-500 hover:border-blue-300'
}

function getOptionLabel(idx) {
  if (!props.question.options?.[idx]) return String(idx)
  return contentToText(props.question.options[idx])
}

async function submit() {
  if (!props.question || !selected.value.length) return
  const sortedUser = [...selected.value].sort((a, b) => a - b)
  const sortedCorrect = [...props.question.answer].sort((a, b) => a - b)
  isCorrect.value = sortedUser.length === sortedCorrect.length && sortedUser.every((v, i) => v === sortedCorrect[i])
  submitted.value = true
  try {
    await cRequest('/api/lms/questions/submit', {
      method: 'POST',
      body: { question_id: props.questionId, user_answer: [...selected.value], is_correct: isCorrect.value },
    })
  } catch { /* 接口暂未实现 */ }
}

function reset() {
  submitted.value = false
  selected.value = []
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
function isRichDoc(content) {
  return content && typeof content === 'object' && !Array.isArray(content) && content.type
}
</script>
