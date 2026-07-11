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
import { ref, computed, inject, watch } from 'vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()

// 从 options 读取图片 URL 和分割数
const opts = computed(() => {
  const o = props.question.options
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    return { url: o.url || '', split: Number(o.split) || 3 }
  }
  return { url: '', split: 3 }
})
const imageUrl = computed(() => opts.value.url)
const split = computed(() => opts.value.split)

// pieces: 用户排列的原始索引数组
// pieces[0] = 原始索引 2 表示位置 0 显示第 2 块
const pieces = ref([])
const selectedPos = ref(null)

const hasAnswer = computed(() => pieces.value.length > 0)

// 打乱顺序
function shuffle() {
  const n = split.value * split.value
  const indices = Array.from({ length: n }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  // 避免刚好和正确顺序一样
  if (indices.length > 1 && indices.every((v, i) => v === i)) {
    ;[indices[0], indices[1]] = [indices[1], indices[0]]
  }
  pieces.value = indices
  recordAnswer(props.question, [...indices])
}

// 监听 question 变化初始化
watch(() => props.question, (q) => {
  if (q?.type === 'puzzle' && opts.value.url) {
    shuffle()
  }
}, { immediate: true })

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  pieces.value = [...record]
}, { immediate: true })

// 点击交换
function onPieceClick(pos) {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  if (selectedPos.value === null) {
    selectedPos.value = pos
  } else if (selectedPos.value === pos) {
    selectedPos.value = null
  } else {
    // 交换
    const arr = [...pieces.value]
    ;[arr[selectedPos.value], arr[pos]] = [arr[pos], arr[selectedPos.value]]
    pieces.value = arr
    selectedPos.value = null
    recordAnswer(props.question, [...arr])
  }
}

// 每块的背景样式
function pieceStyle(originalIndex) {
  const s = split.value
  const row = Math.floor(originalIndex / s)
  const col = originalIndex % s
  const posX = s > 1 ? (col / (s - 1)) * 100 : 0
  const posY = s > 1 ? (row / (s - 1)) * 100 : 0
  return {
    backgroundImage: `url(${imageUrl.value})`,
    backgroundSize: `${s * 100}% ${s * 100}%`,
    backgroundPosition: `${posX}% ${posY}%`,
  }
}

function pieceClass(pos, originalIndex) {
  if (selectedPos.value === pos) {
    return 'ring-2 ring-blue-500 ring-offset-1'
  }
  if (!submitted.value) return ''
  if (isCorrect.value) {
    return 'ring-1 ring-green-400'
  }
  // 答错：逐块着色
  const correctOrder = props.question.answer || []
  if (correctOrder[pos] === originalIndex) {
    return 'ring-1 ring-green-400'
  }
  return 'ring-1 ring-red-400'
}

function submit() {
  if (!props.question || !pieces.value.length) return
  const correctOrder = props.question.answer || []
  const correct = correctOrder.length === pieces.value.length &&
    pieces.value.every((idx, i) => idx === correctOrder[i])
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: [...pieces.value],
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: courseId.value,
    chapterId: chapterId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  shuffle()
  selectedPos.value = null
}

function fillCorrectAnswer() {
  const correctOrder = props.question.answer || []
  if (correctOrder.length) {
    pieces.value = [...correctOrder]
    recordAnswer(props.question, [...correctOrder])
  }
  selectedPos.value = null
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>