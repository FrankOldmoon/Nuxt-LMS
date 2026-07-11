<template>
  <div>
    <textarea
      ref="textareaRef"
      v-model="userAnswer"
      :rows="3"
      :placeholder="$t('question.shortAnswerPlaceholder')"
      :disabled="false"
      class="w-full p-3 rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors resize-y"
      :class="inputClass"
      @input="onInput"
    />
    <p v-if="submitted && !isCorrect" class="text-xs text-gray-400 mt-1">
      {{ $t('question.shortAnswerCorrectPattern') }}: <code class="font-mono text-blue-500">{{ correctPattern }}</code>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()

const userAnswer = ref('')
const textareaRef = ref(null)

const hasAnswer = computed(() => userAnswer.value.trim() !== '')

// 正确答案的正则表达式
const correctPattern = computed(() => {
  const ans = props.question.answer || []
  return Array.isArray(ans) ? (ans[0] || '') : String(ans || '')
})

// 编译正则
function compileRegex() {
  const pattern = correctPattern.value
  if (!pattern) return null
  try {
    return new RegExp(pattern)
  } catch {
    return null
  }
}

// 监听 question 变化
watch(() => props.question, () => {
  userAnswer.value = ''
}, { immediate: true })

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  userAnswer.value = String(record[0] || '')
}, { immediate: true })

function onInput() {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  recordAnswer(props.question, [userAnswer.value])
}

const inputClass = computed(() => {
  if (!submitted.value) return ''
  if (isCorrect.value) {
    return 'border-green-400 bg-green-50 dark:bg-green-900/20'
  }
  return 'border-red-400 bg-red-50 dark:bg-red-900/20'
})

function submit() {
  if (!props.question) return
  const re = compileRegex()
  const correct = re ? re.test(userAnswer.value.trim()) : false
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: [userAnswer.value.trim()],
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: courseId.value,
    chapterId: chapterId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  userAnswer.value = ''
  props.question.record = []
}

function fillCorrectAnswer() {
  // 简答题无法自动填充正确答案，只展示正则
  // 用能匹配正则的示例文本（如 "abc"）作为提示
  const re = compileRegex()
  if (re) {
    userAnswer.value = ''
    recordAnswer(props.question, [''])
  }
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>