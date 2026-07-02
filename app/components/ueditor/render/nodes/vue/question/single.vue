<template>
  <div>
    <!-- 选项列表 -->
    <div class="space-y-2">
      <label
        v-for="(opt, idx) in question.options"
        :key="idx"
        class="flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors"
        :class="optionClass(idx)"
        @click="select(idx)"
      >
        <span class="shrink-0 w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center"
          :class="dotClass(idx)">
          <span v-if="selected === idx" class="w-2.5 h-2.5 rounded-full bg-current"></span>
        </span>
        <span class="flex-1 text-sm">
          <ueditorRender v-if="isRichDoc(opt)" :json="opt" />
          <span v-else>{{ contentToText(opt) }}</span>
        </span>
      </label>
    </div>

    <!-- 提交/重置按钮 -->
    <div v-if="!submitted" class="flex justify-end gap-2 pt-3">
      <UButton variant="soft" size="sm" :disabled="selected < 0" @click="reset">
        {{ $t('common.reset') }}
      </UButton>
      <UButton color="primary" size="sm" :disabled="selected < 0" @click="submit">
        {{ $t('question.submit') }}
      </UButton>
    </div>

    <!-- 提交后结果 -->
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
import { submitQuestion, recordAnswer, contentToText, isRichDoc } from './shared.ts'

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
  // 实时记录作答
  recordAnswer(props.question, [idx])
}

function optionClass(idx) {
  if (submitted.value) {
    const correct = props.question.answer[0] === idx
    if (correct) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
    if (selected.value === idx && !correct) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
    return 'border-gray-200 dark:border-gray-600'
  }
  return selected.value === idx
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
}

function dotClass(idx) {
  if (submitted.value) {
    const correct = props.question.answer[0] === idx
    if (correct) return 'border-green-400 text-green-500'
    if (selected.value === idx && !correct) return 'border-red-400 text-red-500'
    return 'border-gray-300 dark:border-gray-500'
  }
  return selected.value === idx
    ? 'border-blue-400 text-blue-500'
    : 'border-gray-300 dark:border-gray-500'
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
