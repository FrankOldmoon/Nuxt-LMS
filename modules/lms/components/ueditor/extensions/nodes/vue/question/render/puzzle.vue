<template>
  <div>
    <p class="text-xs text-gray-500 mb-3">
      {{ $t('question.puzzleRenderHint') }}
      <!-- 选中一块后紧跟提示（不单独显示在下方） -->
      <span v-if="selectedPos !== null" class="text-blue-500 ml-2">{{ $t('question.puzzleSelectAnother') }}</span>
    </p>

    <!-- 拼图网格 -->
    <div v-if="imageUrl && split" class="flex justify-center select-none">
      <div
        class="grid"
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
