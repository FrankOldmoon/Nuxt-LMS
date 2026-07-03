<template>
  <div class="sub-question-render p-3 mb-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/30"
    :data-question-id="uniqueId">
    <!-- 子题头部 -->
    <div class="flex items-center gap-2 mb-2">
      <span class="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-medium">
        {{ index + 1 }}
      </span>
      <span class="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded text-xs font-medium">
        {{ typeLabel }}
      </span>
      <span class="font-semibold text-gray-800 dark:text-gray-200 text-sm">{{ subQuestion.name }}</span>
      <span class="text-xs text-gray-400 ml-auto">{{ subQuestion.point }}{{ $t('question.points') }}</span>
    </div>

    <!-- 子题内容（html 题型由组件内部处理） -->
    <div v-if="subQuestion.type !== 'html'" class="prose prose-sm dark:prose-invert max-w-none mb-2">
      <ueditorRender :json="subQuestion.content" />
    </div>

    <!-- 子题特定渲染组件 -->
    <component v-if="renderComponent" :is="renderComponent" ref="renderRef"
      :question="localQuestion" :question-id="0" />

    <!-- 子题结果 -->
    <div v-if="submitted" class="mt-2">
      <div class="flex items-center gap-2">
        <UIcon :name="isCorrect ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
          :class="isCorrect ? 'text-green-500' : 'text-red-500'" class="w-4 h-4" />
        <span class="text-xs" :class="isCorrect ? 'text-green-600' : 'text-red-600'">
          {{ isCorrect ? $t('question.correct') : $t('question.wrong') }}
        </span>
      </div>
    </div>

    <!-- 教师查看答案 -->
    <div v-if="showAnswer" class="mt-2 p-2 rounded bg-blue-50 dark:bg-blue-900/20">
      <span class="text-xs text-blue-600 dark:text-blue-300">{{ $t('question.correctAnswerLabel') }}: </span>
      <span class="text-xs font-medium text-blue-700 dark:text-blue-200">{{ formattedAnswer }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, provide, watch } from 'vue'
import { computeCorrectRate } from './shared.ts'
import SingleRender from './single.vue'
import JudgeRender from './judge.vue'
import MultipleRender from './multiple.vue'
import FillRender from './fill.vue'
import SelectRender from './select.vue'
import SortRender from './sort.vue'
import ClassifyRender from './classify.vue'
import PuzzleRender from './puzzle.vue'
import HtmlRender from './html.vue'
import ShortAnswerRender from './short-answer.vue'
import MatchRender from './match.vue'

const props = defineProps({
  subQuestion: { type: Object, required: true },
  index: { type: Number, default: 0 },
  showAnswer: { type: Boolean, default: false },
})

const emit = defineEmits(['answer-change'])

const { t } = useI18n()

// 唯一 ID 用于 DOM 查询（fill/select 需要用到 [data-question-id]）
const uniqueId = computed(() => 90000 + props.index)

// 本地 question 对象（深拷贝子题，独立管理 record）
const localQuestion = ref({})

function initLocal() {
  localQuestion.value = {
    ...JSON.parse(JSON.stringify(props.subQuestion)),
    record: [],
  }
}
initLocal()

// 子题变化时重新初始化
watch(() => props.subQuestion, () => {
  initLocal()
}, { deep: true })

// 本地状态
const submitted = ref(false)
const isCorrect = ref(false)
const fromRecord = ref(false)

provide('questionSubmitted', submitted)
provide('questionIsCorrect', isCorrect)
provide('questionFromRecord', fromRecord)

// 渲染组件映射
const componentMap = {
  single: SingleRender, judge: JudgeRender, multiple: MultipleRender,
  fill: FillRender, select: SelectRender, sort: SortRender,
  classify: ClassifyRender, puzzle: PuzzleRender, html: HtmlRender,
  'short-answer': ShortAnswerRender, match: MatchRender,
}

const renderComponent = computed(() => componentMap[props.subQuestion.type] || null)
const renderRef = ref(null)

const typeLabel = computed(() => {
  const labels = {
    single: t('question.typeSingle'), judge: t('question.typeJudge'),
    multiple: t('question.typeMultiple'), fill: t('question.typeFill'),
    select: t('question.typeSelect'), sort: t('question.typeSort'),
    classify: t('question.typeClassify'), puzzle: t('question.typePuzzle'),
    html: t('question.typeHtml'), 'short-answer': t('question.typeShortAnswer'),
    match: t('question.typeMatch'),
  }
  return labels[props.subQuestion.type] || props.subQuestion.type
})

// 监听 record 变化，通知父组件
watch(() => localQuestion.value?.record, (record) => {
  if (Array.isArray(record)) {
    emit('answer-change', [...record])
  }
}, { deep: true })

// 格式化答案显示
const formattedAnswer = computed(() => {
  const answer = props.subQuestion.answer || []
  const type = props.subQuestion.type
  if (type === 'single' || type === 'multiple') {
    return answer.map(idx => String.fromCharCode(65 + idx)).join(', ')
  }
  if (type === 'judge') {
    return answer.map(idx => idx === 0 ? t('question.correct') : t('question.wrong')).join(', ')
  }
  return answer.join(', ')
})

// 暴露方法
function submit() {
  if (!renderRef.value) return null
  const result = renderRef.value.submit()
  if (result) {
    submitted.value = true
    fromRecord.value = false
  }
  return result
}

function hasAnswer() {
  return renderRef.value?.hasAnswer ?? false
}

function fillCorrectAnswer() {
  renderRef.value?.fillCorrectAnswer()
}

// 设置 record（用于回填）
function setRecord(record) {
  if (Array.isArray(record) && record.length > 0) {
    localQuestion.value.record = [...record]
    submitted.value = true
    fromRecord.value = true
    // 计算 isCorrect
    const rate = computeCorrectRate(localQuestion.value)
    isCorrect.value = rate >= 1
  }
}

defineExpose({ submit, hasAnswer, fillCorrectAnswer, setRecord, submitted, isCorrect })
</script>
