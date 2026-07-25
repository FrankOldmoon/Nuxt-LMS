<template>
  <div>
    <p class="text-xs text-gray-500 mb-3">{{ $t('question.matchRenderHint') }}</p>

    <div ref="containerRef" class="relative flex gap-32 py-2">
      <!-- SVG 连线层 -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0;">
        <!-- 已建立的连线 -->
        <line
          v-for="(rightIdx, leftIdx) in connections"
          :key="`line-${leftIdx}`"
          :x1="getLeftX(leftIdx)" :y1="getLeftY(leftIdx)"
          :x2="getRightX(rightIdx)" :y2="getRightY(rightIdx)"
          :stroke="getLineColor(leftIdx, rightIdx)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <!-- 临时连线（选中左侧后跟随鼠标） -->
        <line
          v-if="selectedLeft !== null && mousePos.x > 0"
          :x1="getLeftX(selectedLeft)" :y1="getLeftY(selectedLeft)"
          :x2="mousePos.x" :y2="mousePos.y"
          stroke="#3b82f6"
          stroke-width="2"
          stroke-dasharray="4 4"
          stroke-linecap="round"
        />
      </svg>

      <!-- 左侧项列表 -->
      <div class="flex-1 space-y-2 relative" style="z-index: 1;">
        <div
          v-for="(pair, leftIdx) in leftItems"
          :key="`l-${leftIdx}`"
          :ref="el => leftEls[leftIdx] = el"
          class="flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors"
          :class="leftItemClass(leftIdx)"
          @click="onLeftClick(leftIdx)"
        >
          <span class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium"
            :class="selectedLeft === leftIdx ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-500 text-gray-400'">
            {{ leftIdx + 1 }}
          </span>
          <span class="flex-1 text-sm">{{ pair.left }}</span>
        </div>
      </div>

      <!-- 右侧项列表（打乱顺序） -->
      <div class="flex-1 space-y-2 relative" style="z-index: 1;">
        <div
          v-for="(item, rightIdx) in rightItems"
          :key="`r-${rightIdx}`"
          :ref="el => rightEls[rightIdx] = el"
          class="flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-colors"
          :class="rightItemClass(rightIdx)"
          @click="onRightClick(rightIdx)"
          @mouseenter="onRightHover(rightIdx)"
          @mouseleave="hoveredRight = null"
        >
          <span class="flex-1 text-sm text-right">{{ item.text }}</span>
          <span class="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium"
            :class="getConnectionCount(rightIdx) > 0 ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 dark:border-gray-500 text-gray-400'">
            {{ String.fromCharCode(65 + rightIdx) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <p v-if="selectedLeft !== null" class="text-xs text-blue-500 mt-2">
      {{ $t('question.matchSelectRight') }}
    </p>
    <p v-else-if="hasAnswer" class="text-xs text-gray-400 mt-2">
      {{ $t('question.matchClickToConnect') }}
    </p>
  </div>
</template>

<script setup>
import { useMatch } from './useMatch'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const {
  leftItems, rightItems, connections, selectedLeft, hoveredRight, mousePos,
  containerRef, leftEls, rightEls, hasAnswer,
  onLeftClick, onRightClick, onRightHover,
  getLeftX, getLeftY, getRightX, getRightY,
  leftItemClass, rightItemClass, getLineColor, getConnectionCount,
  submit, reset, fillCorrectAnswer,
} = useMatch(props)

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
