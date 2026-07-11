<template>
  <div class="space-y-2">
    <!-- 子题列表 -->
    <SubQuestionRenderer
      v-for="(sub, idx) in subQuestions"
      :key="idx"
      ref="subRefs"
      :sub-question="sub"
      :index="idx"
      :show-answer="showAnswer"
      @answer-change="(record) => onAnswerChange(idx, record)"
    />

    <!-- 无子题提示 -->
    <div v-if="!subQuestions.length" class="text-center py-4 text-gray-400 text-sm">
      {{ $t('question.compositeNoSub') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, watch, nextTick } from 'vue'
import SubQuestionRenderer from './sub-question.vue'
import { submitQuestion, recordAnswer, computeCorrectRate } from './shared.ts'

const props = defineProps({
  question: { type: Object, required: true },
  questionId: { type: Number, default: 0 },
})

const submitted = inject('questionSubmitted')
const isCorrect = inject('questionIsCorrect')
const fromRecord = inject('questionFromRecord')
const { courseId, chapterId } = useLmsContext()

// 子题列表（存储在 question.content 中）
const subQuestions = computed(() => {
  return Array.isArray(props.question.content) ? props.question.content : []
})

const subRefs = ref([])
const showAnswer = ref(false)

// 各子题的 record
const subRecords = ref({})

// 防止 fillCorrectAnswer → setRecord → answer-change → syncRecord → record watcher → setRecord 循环
let isRestoring = false

const hasAnswer = computed(() => {
  return Object.keys(subRecords.value).length > 0
})

// 子题答案变化
function onAnswerChange(idx, record) {
  subRecords.value[idx] = record
  if (submitted.value) {
    submitted.value = false
  }
  if (fromRecord.value) {
    fromRecord.value = false
  }
  if (!isRestoring) {
    syncRecord()
  }
}

// 同步到 question.record
function syncRecord() {
  const record = subQuestions.value.map((_, i) => subRecords.value[i] || [])
  recordAnswer(props.question, record)
}

// 监听 question.record 变化（fetchRecord 回填场景 / fillCorrectAnswer 触发）
watch(() => props.question?.record, (record) => {
  if (!Array.isArray(record) || record.length === 0) return
  // 将每个子题的 record 设置到对应的 SubQuestionRenderer
  isRestoring = true
  nextTick(() => {
    record.forEach((subRecord, idx) => {
      if (Array.isArray(subRecord) && subRecord.length > 0) {
        subRefs.value[idx]?.setRecord(subRecord)
        subRecords.value[idx] = subRecord
      }
    })
    // 回填后若父级已是 submitted 状态，子题也显示判断
    if (submitted.value) {
      subRefs.value.forEach(ref => ref?.applyJudgment?.())
    }
    nextTick(() => { isRestoring = false })
  })
}, { immediate: true })

// 监听 submitted 变化（reset 场景）
watch(submitted, (val) => {
  if (!val) {
    showAnswer.value = false
    subRecords.value = {}
  }
})

function submit() {
  if (!props.question || !subQuestions.value.length) return
  // 调用每个子题的 submit
  const results = []
  subRefs.value.forEach(ref => {
    if (ref) {
      const result = ref.submit()
      if (result) results.push(result)
    }
  })
  // 计算总分和得分
  let totalPoint = 0
  let correctPoint = 0
  subQuestions.value.forEach((sub, i) => {
    const pt = Number(sub.point) || 0
    totalPoint += pt
    const subRecord = subRecords.value[i] || []
    const subQuestion = { ...sub, record: subRecord }
    const rate = computeCorrectRate(subQuestion)
    correctPoint += rate * pt
  })
  const correctRate = totalPoint > 0 ? correctPoint / totalPoint : 0
  const correct = correctRate >= 1 && results.length === subQuestions.value.length
  isCorrect.value = correct

  // 构建完整 record
  const fullRecord = subQuestions.value.map((_, i) => subRecords.value[i] || [])

  submitQuestion({
    questionId: props.questionId,
    userAnswer: fullRecord,
    isCorrect: correct,
    correctRate,
    courseId: courseId.value,
    chapterId: chapterId.value,
    point: totalPoint,
  })
  return { isCorrect: correct }
}

function reset() {
  showAnswer.value = false
  subRecords.value = {}
  props.question.record = []
  subRefs.value.forEach(ref => ref?.reset?.())
}

function fillCorrectAnswer() {
  showAnswer.value = true
  subRefs.value.forEach(ref => {
    ref?.fillCorrectAnswer()
  })
}

defineExpose({ submit, reset, hasAnswer, fillCorrectAnswer })
</script>