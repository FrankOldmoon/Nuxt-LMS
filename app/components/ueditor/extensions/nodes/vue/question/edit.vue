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

        <!-- ========== 公共 UI：题目内容 ========== -->
        <div>
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
          <FormInputTags v-model="form.tags" :placeholder="$t('question.tagPlaceholder')" :add-text="$t('question.addTag')" />
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
])

// 题型 → 组件映射
const componentMap = { single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor, fill: FillEditor, select: SelectEditor }
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
    form.value = null
    return
  }
  const normalized = {
    name: props.question.name || '',
    content: props.question.content || '',
    options: Array.isArray(props.question.options) ? [...props.question.options] : [],
    type: props.question.type || 'single',
    point: Number(props.question.point) || 0,
    answer: Array.isArray(props.question.answer) ? [...props.question.answer] : [],
    explanation: props.question.explanation || '',
    tags: Array.isArray(props.question.tags) ? [...props.question.tags] : [],
    record: Array.isArray(props.question.record) ? [...props.question.record] : [],
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
      await cRequest('/api/lms/questions/update', {
        method: 'POST',
        body: { id: props.questionId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      // 新题目：新增并拿回 cid
      const result = await cRequest('/api/lms/questions/add', {
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
