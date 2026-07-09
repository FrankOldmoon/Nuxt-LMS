<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <label class="text-xs text-gray-500">{{ $t('question.compositeSubQuestions') }}</label>
      <UButton variant="ghost" size="2xs" icon="i-heroicons-plus" @click="addSub">
        {{ $t('question.compositeAddSub') }}
      </UButton>
    </div>

    <div v-if="!subQuestions.length" class="text-xs text-gray-400 py-2 text-center">
      {{ $t('question.compositeEmpty') }}
    </div>

    <!-- 子题列表 -->
    <div class="space-y-3">
      <div v-for="(sub, idx) in subQuestions" :key="idx"
        class="rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
        <!-- 子题头部 -->
        <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800">
          <span class="shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-medium">
            {{ idx + 1 }}
          </span>
          <UInput v-model="sub.name" :placeholder="$t('question.namePlaceholder')" size="xs" class="flex-1" />
          <USelect v-model="sub.type" :items="subTypeOptions" size="xs" class="w-28" @change="onSubTypeChange(idx)" />
          <UInput v-model.number="sub.point" type="number" size="xs" class="w-16" :placeholder="$t('question.pointPlaceholder')" />
          <UButton variant="ghost" size="2xs" color="red" icon="i-heroicons-x-mark" @click="removeSub(idx)" />
        </div>
        <!-- 子题内容编辑 -->
        <div class="p-3 space-y-2">
          <!-- 子题题目内容 -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.contentLabel') }}</label>
            <richEditor v-model="sub.content" />
          </div>
          <!-- 子题特定编辑器 -->
          <component v-if="getSubEditor(sub.type)" :is="getSubEditor(sub.type)" :form="sub" />
          <!-- 子题答案解析 -->
          <div>
            <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.explanationLabel') }}</label>
            <richEditor v-model="sub.explanation" />
          </div>
        </div>
      </div>
    </div>

    <!-- 汇总信息 -->
    <div v-if="subQuestions.length" class="mt-3 p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-xs text-indigo-600 dark:text-indigo-300">
      {{ $t('question.compositeSummary', { count: subQuestions.length, point: totalPoint }) }}
    </div>
  </div>
</template>

<script setup>
import SingleEditor from './single.vue'
import JudgeEditor from './judge.vue'
import MultipleEditor from './multiple.vue'
import FillEditor from './fill.vue'
import SelectEditor from './select.vue'
import SortEditor from './sort.vue'
import ClassifyEditor from './classify.vue'
import PuzzleEditor from './puzzle.vue'
import HtmlEditor from './html.vue'
import ShortAnswerEditor from './short-answer.vue'
import MatchEditor from './match.vue'

const props = defineProps({
  form: { type: Object, required: true },
})
const { t } = useI18n()

// 子题类型选项（排除 composite）
const subTypeOptions = computed(() => [
  { label: t('question.typeSingle'), value: 'single' },
  { label: t('question.typeJudge'), value: 'judge' },
  { label: t('question.typeMultiple'), value: 'multiple' },
  { label: t('question.typeFill'), value: 'fill' },
  { label: t('question.typeSelect'), value: 'select' },
  { label: t('question.typeSort'), value: 'sort' },
  { label: t('question.typeClassify'), value: 'classify' },
  { label: t('question.typePuzzle'), value: 'puzzle' },
  { label: t('question.typeHtml'), value: 'html' },
  { label: t('question.typeShortAnswer'), value: 'short-answer' },
  { label: t('question.typeMatch'), value: 'match' },
])

// 子题编辑器映射
const subEditorMap = {
  single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor,
  fill: FillEditor, select: SelectEditor, sort: SortEditor,
  classify: ClassifyEditor, puzzle: PuzzleEditor, html: HtmlEditor,
  'short-answer': ShortAnswerEditor, match: MatchEditor,
}

function getSubEditor(type) {
  return subEditorMap[type] || null
}

// 子题列表（存储在 form.content 中）
const subQuestions = ref([])

function initSubQuestions() {
  const content = props.form.content
  if (Array.isArray(content)) {
    subQuestions.value = content
  } else {
    subQuestions.value = []
    props.form.content = subQuestions.value
  }
}
initSubQuestions()

// 总分
const totalPoint = computed(() => {
  return subQuestions.value.reduce((sum, sub) => sum + (Number(sub.point) || 0), 0)
})

// 子题变化时同步 point 和 tags 到 form
watch([subQuestions, totalPoint], () => {
  // point = 子题总分
  props.form.point = totalPoint.value
  // tags = 子题标签的并集
  const allTags = new Set()
  subQuestions.value.forEach(sub => {
    (sub.tags || []).forEach(tag => allTags.add(tag))
  })
  props.form.tags = Array.from(allTags)
  // content 保持引用同步
  props.form.content = subQuestions.value
}, { deep: true, immediate: true })

function addSub() {
  subQuestions.value.push({
    type: 'single',
    name: '',
    content: '',
    options: ['', '', '', ''],
    answer: [0],
    point: 1,
    tags: [],
    explanation: '',
  })
}

function removeSub(idx) {
  subQuestions.value.splice(idx, 1)
}

function onSubTypeChange(idx) {
  const sub = subQuestions.value[idx]
  if (!sub) return
  switch (sub.type) {
    case 'judge':
      sub.options = [t('question.correct'), t('question.wrong')]
      sub.answer = [0]
      break
    case 'fill':
      sub.options = []
      sub.answer = []
      break
    case 'single':
      sub.options = ['', '', '', '']
      sub.answer = [0]
      break
    case 'multiple':
      sub.options = ['', '', '', '']
      sub.answer = []
      break
    case 'select':
      sub.options = []
      sub.answer = []
      break
    case 'sort':
      sub.options = ['', '', '']
      sub.answer = [0, 1, 2]
      break
    case 'classify':
      sub.options = [{ name: '', items: ['', ''] }, { name: '', items: ['', ''] }]
      sub.answer = [0, 0, 1, 1]
      break
    case 'puzzle':
      sub.options = { url: '', split: 3 }
      sub.answer = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      break
    case 'html':
      sub.options = []
      sub.answer = [1]
      sub.content = ''
      break
    case 'short-answer':
      sub.options = []
      sub.answer = ['']
      break
    case 'match':
      sub.options = [{ left: '', right: '' }, { left: '', right: '' }]
      sub.answer = [0, 1]
      break
  }
}
</script>
