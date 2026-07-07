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
import { ref, computed, inject, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { editableCourseId, editableId } = useLayoutState()

// 左侧项（原始顺序）
const leftItems = computed(() => props.question.options || [])

// 右侧项（打乱顺序后的 { text, originalIndex }）
const rightItems = ref([])

// connections[leftIdx] = rightIdx（右侧在 rightItems 中的位置）
const connections = ref({})
const selectedLeft = ref(null)
const hoveredRight = ref(null)
const mousePos = ref({ x: 0, y: 0 })

// DOM refs
const containerRef = ref(null)
const leftEls = ref([])
const rightEls = ref([])

const hasAnswer = computed(() => Object.keys(connections.value).length > 0)

// 打乱右侧项
function shuffleRight() {
  const items = (props.question.options || []).map((pair, i) => ({
    text: pair.right,
    originalIndex: i,
  }))
  // Fisher-Yates 打乱
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  // 避免刚好和原始顺序一样
  if (items.length > 1 && items.every((it, i) => it.originalIndex === i)) {
    ;[items[0], items[1]] = [items[1], items[0]]
  }
  rightItems.value = items
  leftEls.value = []
  rightEls.value = []
}

// 监听 question 变化初始化
watch(() => props.question, (q) => {
  if (q?.type === 'match' && Array.isArray(q.options) && q.options.length) {
    connections.value = {}
    selectedLeft.value = null
    shuffleRight()
  }
}, { immediate: true })

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  // record[leftIdx] = rightOriginalIndex
  // 需要转换为 connections[leftIdx] = rightItems 中的位置
  const newConn = {}
  record.forEach((rightOriginalIdx, leftIdx) => {
    if (rightOriginalIdx < 0) return
    const rightPos = rightItems.value.findIndex(r => r.originalIndex === rightOriginalIdx)
    if (rightPos >= 0) newConn[leftIdx] = rightPos
  })
  connections.value = newConn
}, { immediate: true })

// 同步到 record
function syncRecord() {
  const answer = props.question.answer || []
  const record = new Array(answer.length).fill(-1)
  Object.keys(connections.value).forEach(leftIdx => {
    const rightPos = connections.value[leftIdx]
    if (rightPos >= 0 && rightItems.value[rightPos]) {
      record[Number(leftIdx)] = rightItems.value[rightPos].originalIndex
    }
  })
  recordAnswer(props.question, record)
}

// 点击左侧
function onLeftClick(leftIdx) {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  if (selectedLeft.value === leftIdx) {
    selectedLeft.value = null
  } else {
    selectedLeft.value = leftIdx
  }
}

// 点击右侧
function onRightClick(rightIdx) {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  if (selectedLeft.value === null) return

  const leftIdx = selectedLeft.value
  const newConn = { ...connections.value }

  // 如果该右侧已被其他左侧连接，断开那个连接
  const existingLeft = Object.keys(newConn).find(k => newConn[k] === rightIdx)
  if (existingLeft !== undefined) {
    delete newConn[existingLeft]
  }

  // 如果该左侧已连接其他右侧，替换
  if (newConn[leftIdx] !== undefined) {
    delete newConn[leftIdx]
  }

  newConn[leftIdx] = rightIdx
  connections.value = newConn
  selectedLeft.value = null
  syncRecord()
}

function onRightHover(rightIdx) {
  hoveredRight.value = rightIdx
}

// 获取坐标
function getLeftX(idx) {
  const el = leftEls.value[idx]
  const container = containerRef.value
  if (!el || !container) return 0
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elRect.right - containerRect.left
}

function getLeftY(idx) {
  const el = leftEls.value[idx]
  const container = containerRef.value
  if (!el || !container) return 0
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elRect.top + elRect.height / 2 - containerRect.top
}

function getRightX(idx) {
  const el = rightEls.value[idx]
  const container = containerRef.value
  if (!el || !container) return 0
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elRect.left - containerRect.left
}

function getRightY(idx) {
  const el = rightEls.value[idx]
  const container = containerRef.value
  if (!el || !container) return 0
  const elRect = el.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return elRect.top + elRect.height / 2 - containerRect.top
}

// 鼠标移动跟踪（用于临时连线）
function onMouseMove(e) {
  if (selectedLeft.value === null || !containerRef.value) return
  const containerRect = containerRef.value.getBoundingClientRect()
  mousePos.value = {
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top,
  }
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
})

// 样式
function leftItemClass(leftIdx) {
  if (selectedLeft.value === leftIdx) {
    return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300'
  }
  if (!submitted.value) {
    return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
  }
  // 提交后着色
  const rightPos = connections.value[leftIdx]
  if (rightPos === undefined) return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
  const isCorrectConn = rightItems.value[rightPos]?.originalIndex === leftIdx
  return isCorrectConn
    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
    : 'border-red-400 bg-red-50 dark:bg-red-900/20'
}

function rightItemClass(rightIdx) {
  if (!submitted.value) {
    return 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-900'
  }
  // 提交后着色
  const leftIdx = Object.keys(connections.value).find(k => connections.value[k] === rightIdx)
  if (leftIdx === undefined) return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900'
  const isCorrectConn = rightItems.value[rightIdx]?.originalIndex === Number(leftIdx)
  return isCorrectConn
    ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
    : 'border-red-400 bg-red-50 dark:bg-red-900/20'
}

function getLineColor(leftIdx, rightPos) {
  if (!submitted.value) return '#3b82f6'
  const isCorrectConn = rightItems.value[rightPos]?.originalIndex === leftIdx
  return isCorrectConn ? '#4ade80' : '#f87171'
}

function getConnectionCount(rightIdx) {
  return Object.values(connections.value).filter(v => v === rightIdx).length
}

function submit() {
  if (!props.question) return
  const answer = props.question.answer || []
  const correct = answer.length === Object.keys(connections.value).length &&
    answer.every((_, leftIdx) => {
      const rightPos = connections.value[leftIdx]
      if (rightPos === undefined) return false
      return rightItems.value[rightPos]?.originalIndex === leftIdx
    })
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: buildRecordArray(),
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function buildRecordArray() {
  const answer = props.question.answer || []
  const record = new Array(answer.length).fill(-1)
  Object.keys(connections.value).forEach(leftIdx => {
    const rightPos = connections.value[leftIdx]
    if (rightPos >= 0 && rightItems.value[rightPos]) {
      record[Number(leftIdx)] = rightItems.value[rightPos].originalIndex
    }
  })
  return record
}

function reset() {
  connections.value = {}
  selectedLeft.value = null
  shuffleRight()
  syncRecord()
}

function fillCorrectAnswer() {
  const answer = props.question.answer || []
  const newConn = {}
  answer.forEach((_, leftIdx) => {
    const rightPos = rightItems.value.findIndex(r => r.originalIndex === leftIdx)
    if (rightPos >= 0) newConn[leftIdx] = rightPos
  })
  connections.value = newConn
  syncRecord()
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
