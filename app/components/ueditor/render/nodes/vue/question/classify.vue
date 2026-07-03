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
import { ref, computed, inject, watch, nextTick } from 'vue'
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

// 扁平化所有选项：[{ text, flatIndex, correctCat }]
const flatItems = computed(() => {
  const result = []
  const options = props.question.options || []
  options.forEach((cat, ci) => {
    (cat.items || []).forEach((text) => {
      result.push({ text, flatIndex: result.length, correctCat: ci })
    })
  })
  return result
})

// 分类名称列表
const categories = computed(() => props.question.options || [])

// 池子（未分类的项）和各分类桶
const pool = ref([])
const catBuckets = ref([])

// 防止 record ↔ 拖拽 互相触发的循环
let restoring = false

// 初始化：所有项打乱后放入池子
function initBuckets() {
  const options = props.question.options || []
  catBuckets.value = options.map(() => [])
  const items = flatItems.value.map(item => ({ ...item }))
  // Fisher-Yates 打乱
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  pool.value = items
  doSyncRecord()
}

// 从当前 pool/catBuckets 构建 record 数组
function buildRecord() {
  const answer = props.question.answer || []
  const record = new Array(answer.length).fill(-1)
  // 池子中的项：-1（默认值，无需显式设置）
  // 分类桶中的项：对应的分类索引
  catBuckets.value.forEach((bucket, ci) => {
    bucket?.forEach(item => {
      record[item.flatIndex] = ci
    })
  })
  return record
}

// 同步到 question.record（带循环保护）
function doSyncRecord() {
  if (restoring) return
  const record = buildRecord()
  // 检查是否与当前 record 一致，避免不必要的更新
  const current = props.question.record
  if (Array.isArray(current) && current.length === record.length &&
      record.every((v, i) => v === current[i])) return
  recordAnswer(props.question, record)
}

// 监听 question 变化初始化
watch(() => props.question, (q) => {
  if (q?.type === 'classify' && Array.isArray(q.options) && q.options.length) {
    initBuckets()
  }
}, { immediate: true })

// 监听 record 变化（fetchRecord 回填场景）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  // 检查是否与当前状态一致，避免循环
  const current = buildRecord()
  if (current.length === record.length && record.every((v, i) => v === current[i])) return
  // 从 record 恢复状态
  restoring = true
  const items = flatItems.value.map(item => ({ ...item }))
  const options = props.question.options || []
  catBuckets.value = options.map(() => [])
  const newPool = []
  record.forEach((catIdx, flatIdx) => {
    const item = items.find(it => it.flatIndex === flatIdx)
    if (!item) return
    if (catIdx >= 0 && catBuckets.value[catIdx]) {
      catBuckets.value[catIdx].push(item)
    } else {
      newPool.push(item)
    }
  })
  pool.value = newPool
  nextTick(() => { restoring = false })
}, { immediate: true })

// 拖拽时更新 record
watch([pool, catBuckets], () => {
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  doSyncRecord()
}, { deep: true })

const hasAnswer = computed(() => {
  return catBuckets.value.some(bucket => bucket && bucket.length > 0)
})

function poolItemClass() {
  return 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
}

function bucketItemClass(element, ci) {
  if (!submitted.value) {
    return 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
  }
  if (element.correctCat === ci) {
    return 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
  }
  return 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

function submit() {
  if (!props.question) return
  const record = buildRecord()
  const answer = props.question.answer || []
  const correct = answer.length === record.length &&
    record.every((cat, i) => cat === answer[i])
  isCorrect.value = correct
  submitQuestion({
    questionId: props.questionId,
    userAnswer: record,
    isCorrect: correct,
    correctRate: computeCorrectRate(props.question),
    courseId: editableCourseId.value,
    chapterId: editableId.value,
    point: props.question.point,
  })
  return { isCorrect: correct }
}

function reset() {
  initBuckets()
}

// 填充正确答案：将每项放入正确的分类
function fillCorrectAnswer() {
  const answer = props.question.answer || []
  if (!answer.length) return
  restoring = true
  const items = flatItems.value.map(item => ({ ...item }))
  const options = props.question.options || []
  catBuckets.value = options.map(() => [])
  pool.value = []
  answer.forEach((catIdx, flatIdx) => {
    const item = items.find(it => it.flatIndex === flatIdx)
    if (!item) return
    if (catIdx >= 0 && catBuckets.value[catIdx]) {
      catBuckets.value[catIdx].push(item)
    }
  })
  recordAnswer(props.question, [...answer])
  nextTick(() => { restoring = false })
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>
