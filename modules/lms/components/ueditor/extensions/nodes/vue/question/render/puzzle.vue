<template>
  <div>
    <p class="text-xs text-gray-500 mb-3">{{ $t('question.puzzleRenderHint') }}</p>

    <!-- 拼图网格 -->
    <div
      v-if="imageUrl && split"
      class="inline-block p-1 border border-gray-200 dark:border-gray-600 rounded select-none"
    >
      <div
        class="grid gap-0.5"
        :style="{ gridTemplateColumns: `repeat(${split}, minmax(0, 1fr))` }"
      >
        <div
          v-for="(originalIndex, pos) in pieces"
          :key="pos"
          class="bg-cover bg-no-repeat cursor-pointer transition-all duration-150 hover:opacity-80"
          :style="pieceStyle(originalIndex)"
          :class="pieceClass(pos, originalIndex)"
          style="aspect-ratio: 1; width: 80px;"
          @click="onPieceClick(pos)"
        />
      </div>
    </div>

    <!-- 提示 -->
    <p v-if="selectedPos !== null" class="text-xs text-blue-500 mt-2">
      {{ $t('question.puzzleSelectAnother') }}
    </p>
  </div>
</template>

<script setup>
import { usePuzzle } from './usePuzzle'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  pieces,
  selectedPos,
  imageUrl,
  split,
  hasAnswer,
  onPieceClick,
  pieceStyle,
  pieceClass,
  submit,
  reset,
  fillCorrectAnswer,
} = usePuzzle(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
