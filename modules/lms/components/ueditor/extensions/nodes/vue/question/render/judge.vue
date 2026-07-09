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
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()
const selected = ref(-1)

const hasAnswer = computed(() => selected.value >= 0)

// 监听 question.record 变化，同步到 selected
watch(() => props.question?.record, (record) => {
  if (record && record.length > 0) {
    selected.value = record[0]
  }
}, { immediate: true })

function select(idx) {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  selected.value = idx
  recordAnswer(props.question, [idx])
}

function btnClass(idx) {
  if (submitted.value) {
    if (isCorrect.value) {
      // 答对：选中项标绿
      if (selected.value === idx) return 'border-green-400 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      return 'border-gray-200 dark:border-gray-600 text-gray-500'
    } else {
      // 答错：只标红用户选错的项，不标绿正确答案
      if (selected.value === idx) return 'border-red-400 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      return 'border-gray-200 dark:border-gray-600 text-gray-500'
    }
  }
  return selected.value === idx
    ? 'border-blue-400 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400'
}

function submit() {
  if (!props.question || selected.value < 0) return
  const correct = selected.value === props.question.answer[0]
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: [selected.value],
    isCorrect: correct,
    correctRate: correct ? 1 : 0,
        courseId: editableCourseId.value,
        chapterId: editableId.value,
        point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  selected.value = -1
  props.question.record = []
}

// 填充正确答案为 record
function fillCorrectAnswer() {
  if (props.question?.answer && props.question.answer.length > 0) {
    selected.value = props.question.answer[0]
    props.question.record = [props.question.answer[0]]
  }
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>