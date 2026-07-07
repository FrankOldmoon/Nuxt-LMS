<template>
  <UModal v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('question.namePlaceholder') }}</h2>

        <!-- ========== 公共 UI：名称 / 类型 / 分值 ========== -->
        <div class="flex items-center gap-3">
          <UInput v-model="form.name" :placeholder="$t('question.namePlaceholder')" class="flex-1" size="sm" />
          <USelect v-model="form.type" :items="typeOptions" size="sm" class="w-32" @change="onTypeChange" />
          <UInput v-model.number="form.point" type="number" :placeholder="$t('question.pointPlaceholder')" size="sm" class="w-20" />
        </div>

        <!-- ========== 公共 UI：题目内容（html/composite 题型由组件内部处理） ========== -->
        <div v-if="form?.type !== 'html' && form?.type !== 'composite'">
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.contentLabel') }}</label>
          <richEditor v-model="form.content" />
        </div>

        <!-- ========== 题型特定组件 ========== -->
        <component :is="typeComponent" v-if="typeComponent" :form="form" />

        <!-- ========== 公共 UI：答案解析 ========== -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.explanationLabel') }}</label>
          <richEditor v-model="form.explanation" />
        </div>

        <!-- ========== 公共 UI：标签 ========== -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.tagsLabel') }}</label>
          <UInputTags v-model="form.tags" :placeholder="$t('question.tagPlaceholder')" :add-text="$t('question.addTag')" />
        </div>

        <!-- ========== 公共 UI：操作按钮 ========== -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="()=>{open = false}">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveQuestion">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
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
import CompositeEditor from './composite.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  questionId: { type: Number, default: 0 },
  question: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { t } = useI18n()
const { editableCourseId } = useLayoutState()

const typeOptions = computed(() => [
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
  { label: t('question.typeComposite'), value: 'composite' },
])

// 题型 → 组件映射
const componentMap = { single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor, fill: FillEditor, select: SelectEditor, sort: SortEditor, classify: ClassifyEditor, puzzle: PuzzleEditor, html: HtmlEditor, 'short-answer': ShortAnswerEditor, match: MatchEditor, composite: CompositeEditor }
const typeComponent = computed(() => componentMap[form.value?.type] || null)

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
let originalData = null

// provide form 给 select node-view，使其能读取 options
provide('questionForm', form)

// 弹窗打开时从 props.question 深拷贝初始化 form
function initForm() {
  if (!props.question) {
    form.value = {
      name: '',
      type: 'single',
      options: ['', '', '', ''],
      answer: [0],
      point: 1,
      content: '',
      explanation: '',
      tags: [],
      record: [],
    }
    originalData = JSON.parse(JSON.stringify(form.value))
    return
  }
  const normalized = {
    name: props.question.name || '',
    options: props.question.options != null ? JSON.parse(JSON.stringify(props.question.options)) : [],
    type: props.question.type || 'single',
    point: Number(props.question.point) || 0,
    answer: Array.isArray(props.question.answer) ? [...props.question.answer] : [],
    explanation: props.question.explanation || '',
    tags: Array.isArray(props.question.tags) ? [...props.question.tags] : [],
    record: Array.isArray(props.question.record) ? JSON.parse(JSON.stringify(props.question.record)) : [],
    // content: 数组时（composite）深拷贝，否则原样
    content: Array.isArray(props.question.content) ? JSON.parse(JSON.stringify(props.question.content)) : props.question.content,
  }
  form.value = normalized
  originalData = JSON.parse(JSON.stringify(normalized))
}

function onTypeChange() {
  if (!form.value) return
  switch (form.value.type) {
    case 'judge':
      form.value.options = [t('question.correct'), t('question.wrong')]
      form.value.answer = [0]
      break
    case 'fill':
      form.value.options = []
      form.value.answer = []
      break
    case 'single':
      form.value.options = ['', '', '', '']
      form.value.answer = [0]
      break
    case 'multiple':
      form.value.options = ['', '', '', '']
      form.value.answer = []
      break
    case 'select':
      form.value.options = []
      form.value.answer = []
      break
    case 'sort':
      form.value.options = ['', '', '']
      form.value.answer = [0, 1, 2]
      break
    case 'classify':
      form.value.options = [
        { name: '', items: ['', ''] },
        { name: '', items: ['', ''] },
      ]
      form.value.answer = [0, 0, 1, 1]
      break
    case 'puzzle':
      form.value.options = { url: '', split: 3 }
      form.value.answer = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      break
    case 'html':
      form.value.options = []
      form.value.answer = [1]
      form.value.content = ''
      break
    case 'short-answer':
      form.value.options = []
      form.value.answer = ['']
      break
    case 'match':
      form.value.options = [
        { left: '', right: '' },
        { left: '', right: '' },
      ]
      form.value.answer = [0, 1]
      break
    case 'composite':
      form.value.options = []
      form.value.answer = []
      form.value.content = []
      break
  }
}

function resetForm() {
  if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
  saveMsg.value = ''
}

async function saveQuestion() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.questionId) {
      // 已有题目：更新
      await cRequest('/api/questions/update', {
        method: 'POST',
        body: { id: props.questionId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      // 新题目：新增并拿回 cid
      const result = await cRequest('/api/questions/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('question.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    open.value = false
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('question.saveFailed')
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) initForm()
  else {
    form.value = null
    saveMsg.value = ''
  }
})
</script>
