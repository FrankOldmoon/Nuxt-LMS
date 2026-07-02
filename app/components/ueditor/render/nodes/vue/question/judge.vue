<template>
  <div>
    <!-- 判断按钮 -->
    <div class="flex gap-4">
      <button
        v-for="(_, idx) in question.options"
        :key="idx"
        class="flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-colors"
        :class="btnClass(idx)"
        @click="select(idx)"
      >
        {{ idx === 0 ? $t('question.correct') : $t('question.wrong') }}
      </button>
    </div>

    <!-- 提交/重置 -->
    <div v-if="!submitted" class="flex justify-end gap-2 pt-3">
      <UButton variant="soft" size="sm" :disabled="selected < 0" @click="reset">
        {{ $t('common.reset') }}
      </UButton>
      <UButton color="primary" size="sm" :disabled="selected < 0" @click="submit">
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
import { submitQuestion, recordAnswer } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const selected = ref(-1)
const submitted = ref(false)
const isCorrect = ref(false)

function select(idx) {
  if (submitted.value) return
  selected.value = idx
  recordAnswer(props.question, [idx])
}

function btnClass(idx) {
  if (submitted.value) {
    const correct = props.question.answer[0] === idx
    if (correct) return 'border-green-400 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    if (selected.value === idx && !correct) return 'border-red-400 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    return 'border-gray-200 dark:border-gray-600 text-gray-500'
  }
  return selected.value === idx
    ? 'border-blue-400 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400'
}

async function submit() {
  if (!props.question || selected.value < 0) return
  isCorrect.value = selected.value === props.question.answer[0]
  submitted.value = true
  await submitQuestion({
    questionId: props.questionId,
    userAnswer: [selected.value],
    isCorrect: isCorrect.value,
  })
}

function reset() {
  submitted.value = false
  selected.value = -1
}

function redo() { reset() }
</script>
