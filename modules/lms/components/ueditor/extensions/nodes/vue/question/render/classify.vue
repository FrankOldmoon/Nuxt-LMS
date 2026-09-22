<template>
  <div>
    <p class="text-xs text-gray-500 mb-3">{{ $t('question.classifyRenderHint') }}</p>

    <div class="flex gap-4">
      <!-- 待分类池 -->
      <div class="w-1/3 shrink-0">
        <div class="text-xs font-medium text-gray-500 mb-2 pb-1 border-b border-gray-200 dark:border-gray-600">
          {{ $t('question.classifyPool') }}
        </div>
        <draggable
          v-model="pool"
          group="classify"
          item-key="flatIndex"
          animation="200"
          class="min-h-[80px] space-y-1.5 p-2 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
          @start="onDragStart"
        >
          <template #item="{ element }">
            <div
              class="px-2.5 py-1.5 rounded text-sm cursor-move border transition-colors"
              :class="poolItemClass()"
            >
              {{ element.text }}
            </div>
          </template>
        </draggable>
      </div>

      <!-- 分类区域 -->
      <div class="flex-1 grid grid-cols-2 gap-3">
        <div v-for="(cat, ci) in categories" :key="ci" class="flex flex-col">
          <div class="text-xs font-medium text-gray-500 mb-2 pb-1 border-b border-gray-200 dark:border-gray-600">
            {{ cat.name || `${$t('question.classifyCategory')} ${ci + 1}` }}
          </div>
          <draggable
            v-model="catBuckets[ci]"
            group="classify"
            item-key="flatIndex"
            animation="200"
            class="flex-1 min-h-[80px] space-y-1.5 p-2 rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
            @start="onDragStart"
          >
            <template #item="{ element }">
              <div
                class="px-2.5 py-1.5 rounded text-sm cursor-move border transition-colors"
                :class="bucketItemClass(element, ci)"
              >
                {{ element.text }}
              </div>
            </template>
          </draggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import draggable from 'vuedraggable'
import { useClassify } from './useClassify'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  pool, catBuckets, categories, hasAnswer,
  poolItemClass, bucketItemClass, submit, reset, fillCorrectAnswer, onDragStart,
} = useClassify(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
