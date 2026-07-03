<template>
  <div>
    <p class="text-xs text-gray-500 mb-2">{{ $t('question.sortRenderHint') }}</p>
    <draggable
      v-model="dragList"
      item-key="originalIndex"
      handle=".sort-drag-handle"
      animation="200"
      class="space-y-2"
    >
      <template #item="{ element, index }">
        <div
          class="flex items-center gap-3 p-3 rounded-md border transition-colors"
          :class="itemClass(element.originalIndex)"
        >
          <span class="sort-drag-handle cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
            <UIcon name="i-heroicons-bars-3" class="w-4 h-4" />
          </span>
          <span class="shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium"
            :class="submitted ? (isCorrect ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-600') : 'bg-blue-500 text-white'">
            {{ index + 1 }}
          </span>
          <span class="flex-1 text-sm">{{ getItemText(element.originalIndex) }}</span>
        </div>
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch } from 'vue'
import draggable from 'vuedraggable'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()

// dragList: [{ originalIndex: 2 }, { originalIndex: 0 }, ...] — 驱动 vuedraggable
const dragList = ref([])
// 防止 dragList watcher → recordAnswer → record watcher → dragList 循环
let isRecording = false
// userOrder: 从 dragList 派生的原始索引数组
const userOrder = computed(() => dragList.value.map(item => item.originalIndex))

const hasAnswer = computed(() => userOrder.value.length > 0)

// 初始化：打乱顺序
function shuffle() {
  const options = props.question.options || []
  const indices = options.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  // 避免刚好和正确顺序一样（如果超过1项）
  if (indices.length > 1 && indices.every((v, i) => v === i)) {
    ;[indices[0], indices[1]] = [indices[1], indices[0]]
  }
  dragList.value = indices.map(idx => ({ originalIndex: idx }))
}

// 监听 question 变化时初始化
watch(() => props.question, (q) => {
  if (q?.type === 'sort' && Array.isArray(q.options) && q.options.length) {
    shuffle()
  }
}, { immediate: true })

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (isRecording) return
  if (!Array.isArray(record) || record.length === 0) return
  dragList.value = record.map(idx => ({ originalIndex: idx }))
}, { immediate: true })



// dragList 变化时实时记录
watch(dragList, () => {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  isRecording = true
  recordAnswer(props.question, [...userOrder.value])
  nextTick(() => { isRecording = false })
}, { deep: true })

function getItemText(originalIndex) {
  const opt = props.question.options?.[originalIndex]
  if (typeof opt === 'string') return opt
  return String(opt || '')
}

function itemClass(originalIndex) {
  if (!submitted.value) {
    return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
  }
  if (isCorrect.value) {
    return 'border-green-400 bg-green-50 dark:bg-green-900/20'
  }
  // 答错：每个位置单独着色
  const correctOrder = props.question.answer || []
  const currentPos = userOrder.value.indexOf(originalIndex)
  if (correctOrder[currentPos] === originalIndex) {
    return 'border-green-400 bg-green-50 dark:bg-green-900/20'
  }
  return 'border-red-400 bg-red-50 dark:bg-red-900/20'
}

function submit() {
  if (!props.question || !userOrder.value.length) return
  const correctOrder = props.question.answer || []
  const correct = correctOrder.length === userOrder.value.length &&
    userOrder.value.every((idx, i) => idx === correctOrder[i])
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: [...userOrder.value],
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  shuffle()
}

// 填充正确答案
function fillCorrectAnswer() {
  const correctOrder = props.question.answer || []
  if (correctOrder.length) {
    dragList.value = correctOrder.map(idx => ({ originalIndex: idx }))
    recordAnswer(props.question, [...correctOrder])
  }
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
