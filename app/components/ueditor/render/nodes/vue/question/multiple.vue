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
import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()
const selected = ref([])

const hasAnswer = computed(() => selected.value.length > 0)

// 监听 question.record 变化，同步到 selected
watch(() => props.question?.record, (record) => {
  if (record && record.length > 0) {
    selected.value = [...record]
  }
}, { immediate: true })

function toggle(idx) {
  if (fromRecord.value) {
    submitted.value = false
    fromRecord.value = false
  }
  const arr = [...selected.value]
  const pos = arr.indexOf(idx)
  if (pos > -1) arr.splice(pos, 1)
  else arr.push(idx)
  selected.value = arr
  recordAnswer(props.question, [...selected.value])
}

function optionClass(idx) {
  if (submitted.value) {
    const sel = selected.value.includes(idx)
    if (isCorrect.value) {
      // 答对：选中项标绿
      if (sel) return 'border-green-400 bg-green-50 dark:bg-green-900/20'
      return 'border-gray-200 dark:border-gray-600'
    } else {
      // 答错：只标红用户选错的项，不标绿/黄正确答案
      if (sel) return 'border-red-400 bg-red-50 dark:bg-red-900/20'
      return 'border-gray-200 dark:border-gray-600'
    }
  }
  return selected.value.includes(idx)
    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
}

function checkClass(idx) {
  if (submitted.value) {
    const sel = selected.value.includes(idx)
    if (isCorrect.value) {
      if (sel) return 'border-green-400 bg-green-400 text-white'
      return 'border-gray-300 dark:border-gray-500'
    } else {
      if (sel) return 'border-red-400 bg-red-400 text-white'
      return 'border-gray-300 dark:border-gray-500'
    }
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
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  selected.value = []
  props.question.record = []
}

// 填充正确答案为 record
function fillCorrectAnswer() {
  if (props.question?.answer && props.question.answer.length > 0) {
    selected.value = [...props.question.answer]
    props.question.record = [...props.question.answer]
  }
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
