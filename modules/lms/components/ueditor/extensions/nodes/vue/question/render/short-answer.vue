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
import { useShortAnswer } from './useShortAnswer'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  submitted,
  isCorrect,
  userAnswer,
  textareaRef,
  hasAnswer,
  correctPattern,
  inputClass,
  onInput,
  submit,
  reset,
  fillCorrectAnswer,
} = useShortAnswer(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
