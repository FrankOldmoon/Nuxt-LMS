<template>
  <div class="sub-question-render p-3 mb-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30"
    :data-question-id="uniqueId">
    <!-- child questionHead -->
    <div class="flex items-center gap-2 mb-2">
      <span class="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-medium">
        {{ index + 1 }}
      </span>
      <span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded text-xs font-medium">
        {{ typeLabel }}
      </span>
      <span class="font-semibold text-gray-800 dark:text-gray-200 text-sm">{{ subQuestion.name }}</span>
      <span class="text-xs text-gray-400 ml-auto">{{ subQuestion.point }}{{ $t('question.points') }}</span>
    </div>

    <!-- child questionContent（html question type by ComponentInsideHandle） -->
    <div v-if="subQuestion.type !== 'html'" class="prose prose-sm dark:prose-invert max-w-none mb-2">
      <ueditorRender :json="subQuestion.content" />
    </div>

    <!-- child question specificRender Component -->
    <component v-if="renderComponent" :is="renderComponent" ref="renderRef"
      :question="localQuestion" :question-id="0" />

    <!-- child question result -->
    <div v-if="submitted" class="mt-2">
      <div class="flex items-center gap-2">
        <UIcon :name="isCorrect ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
          :class="isCorrect ? 'text-green-500' : 'text-red-500'" class="w-4 h-4" />
        <span class="text-xs" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
          {{ isCorrect ? $t('question.correct') : $t('question.wrong') }}
        </span>
      </div>
    </div>

    <!-- TeacherView Answer -->
    <div v-if="showAnswer" class="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
      <span class="text-xs text-blue-600 dark:text-blue-300">{{ $t('question.correctAnswerLabel') }}: </span>
      <span class="text-xs font-medium text-blue-700 dark:text-blue-200">{{ formattedAnswer }}</span>
    </div>
  </div>
</template>

<script setup>
import { useSubQuestion } from './useSubQuestion'

const props = defineProps({
  subQuestion: { type: Object, required: true },
  index: { type: Number, default: 0 },
  showAnswer: { type: Boolean, default: false },
})

const emit = defineEmits(['answer-change'])

const {
  uniqueId, localQuestion, submitted, isCorrect, renderComponent, renderRef,
  typeLabel, formattedAnswer, submit, hasAnswer, fillCorrectAnswer,
  setRecord, applyJudgment, reset,
} = useSubQuestion(props, emit)

defineExpose({ submit, hasAnswer, fillCorrectAnswer, setRecord, applyJudgment, reset, submitted, isCorrect })
</script>
