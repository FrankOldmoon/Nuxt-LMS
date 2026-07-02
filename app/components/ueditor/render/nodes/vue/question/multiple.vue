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
          <ueditorRender :json="opt" />
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { submitQuestion, recordAnswer, contentToText, isRichDoc } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const selected = ref([])

const hasAnswer = computed(() => selected.value.length > 0)

function toggle(idx) {
  if (submitted.value) return
  const arr = [...selected.value]
  const pos = arr.indexOf(idx)
  if (pos > -1) arr.splice(pos, 1)
  else arr.push(idx)
  selected.value = arr
  recordAnswer(props.question, [...selected.value])
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

function submit() {
  if (!props.question || !selected.value.length) return
  const sortedUser = [...selected.value].sort((a, b) => a - b)
  const sortedCorrect = [...props.question.answer].sort((a, b) => a - b)
  const correct = sortedUser.length === sortedCorrect.length && sortedUser.every((v, i) => v === sortedCorrect[i])
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: [...selected.value],
    isCorrect: correct,
  })
  return { isCorrect: correct }
}

function reset() {
  selected.value = []
}

defineExpose({ submit, reset, hasAnswer })
</script>
