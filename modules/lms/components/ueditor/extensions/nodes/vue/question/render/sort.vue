<template>
  <div>
    <p class="text-xs text-gray-500 mb-2">{{ $t('question.sortRenderHint') }}</p>
    <draggable
      v-model="dragList"
      item-key="originalIndex"
      animation="200"
      class="space-y-2"
    >
      <template #item="{ element, index }">
        <div
          class="flex items-center gap-3 p-3 rounded-md border transition-colors cursor-move select-none"
          :class="itemClass(element.originalIndex)"
        >
          <span class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0">
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
import draggable from 'vuedraggable'
import { useSort } from './useSort'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  dragList,
  submitted,
  isCorrect,
  hasAnswer,
  getItemText,
  itemClass,
  submit,
  reset,
  fillCorrectAnswer,
} = useSort(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
