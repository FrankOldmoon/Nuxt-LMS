<template>
  <!-- Modal 模式（预览模式，有 modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
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

        <!-- ========== JSON 原始数据编辑器（高级） ========== -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-3">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-braces" class="size-4 text-gray-500" />
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ $t('question.jsonEditor') }}
              </span>
              <span v-if="showJsonEditor" class="text-xs"
                :class="jsonError ? 'text-red-500' : 'text-green-500'">
                — {{ jsonError || $t('question.jsonValid') }}
              </span>
            </div>
            <UButton size="2xs" variant="ghost"
              :icon="showJsonEditor ? 'i-lucide-eye-off' : 'i-lucide-code'"
              :label="showJsonEditor ? $t('common.hide') : $t('common.show')"
              @click="showJsonEditor = !showJsonEditor" />
          </div>
          <div v-show="showJsonEditor"
            class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
            style="height: 400px;">
            <Monaco v-model="jsonText" language="json" :auto-format="!aiStreaming" />
          </div>
          <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">
            {{ $t('question.jsonHint') }}
          </p>
        </div>

        <!-- ========== AI 出题（输入知识范围 → 流式生成到 Monaco） ========== -->
        <AiGenerator v-if="hasTypePrompt" :type="form.type" @streaming="onAiStreaming" @stream-text="onAiStreamText" @generated="onAiGenerated" />

        <!-- ========== 当前题型的英文出题说明 ========== -->
        <details v-if="currentTypePrompt" class="text-xs">
          <summary class="cursor-pointer text-gray-500 hover:text-primary py-1 select-none flex items-center gap-2">
            <UIcon name="i-lucide-file-text" class="size-3.5" />
            <span>{{ $t('question.typePrompt') }}</span>
            <span class="text-gray-400">— {{ $t('question.typePromptHint') }}</span>
            <UButton
              size="2xs"
              variant="ghost"
              :icon="copyCopied ? 'i-lucide-check' : 'i-lucide-copy'"
              :color="copyCopied ? 'success' : 'neutral'"
              :label="$t('question.typePromptCopy')"
              class="ml-auto"
              @click.stop.prevent="copyCurrentPrompt"
            />
          </summary>
          <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px] text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed">{{ currentTypePrompt }}</pre>
        </details>

        <!-- ========== 公共 UI：操作按钮 ========== -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="() => { open = false }">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveQuestion">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式（编辑器模式，无 modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
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

    <!-- ========== AI 出题（输入知识范围 → 流式生成到 Monaco） ========== -->
    <AiGenerator v-if="hasTypePrompt" :type="form.type" @streaming="onAiStreaming" @stream-text="onAiStreamText" @generated="onAiGenerated" />

    <!-- ========== JSON 原始数据编辑器（高级） ========== -->
    <div class="border-t border-gray-100 dark:border-gray-800 pt-3">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-braces" class="size-4 text-gray-500" />
          <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
            {{ $t('question.jsonEditor') }}
          </span>
          <span v-if="showJsonEditor" class="text-xs"
            :class="jsonError ? 'text-red-500' : 'text-green-500'">
            — {{ jsonError || $t('question.jsonValid') }}
          </span>
        </div>
        <UButton size="2xs" variant="ghost"
          :icon="showJsonEditor ? 'i-lucide-eye-off' : 'i-lucide-code'"
          :label="showJsonEditor ? $t('common.hide') : $t('common.show')"
          @click="showJsonEditor = !showJsonEditor" />
      </div>
      <div v-show="showJsonEditor"
        class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
        style="height: 400px;">
        <Monaco v-model="jsonText" language="json" :auto-format="!aiStreaming" />
      </div>
      <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">
        {{ $t('question.jsonHint') }}
      </p>
    </div>

    <!-- ========== 当前题型的英文出题说明 ========== -->
    <details v-if="currentTypePrompt" class="text-xs">
      <summary class="cursor-pointer text-gray-500 hover:text-primary py-1 select-none flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="size-3.5" />
        <span>{{ $t('question.typePrompt') }}</span>
        <span class="text-gray-400">— {{ $t('question.typePromptHint') }}</span>
        <UButton
          size="2xs"
          variant="ghost"
          :icon="copyCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          :color="copyCopied ? 'success' : 'neutral'"
          :label="$t('question.typePromptCopy')"
          class="ml-auto"
          @click.stop.prevent="copyCurrentPrompt"
        />
      </summary>
      <pre class="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[300px] text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed">{{ currentTypePrompt }}</pre>
    </details>

    <!-- ========== 公共 UI：操作按钮 ========== -->
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
      <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
      <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
      <UButton color="primary" :loading="saving" @click="saveQuestion">{{ $t('common.save') }}</UButton>
    </div>
  </div>
</template>

<script setup>
import SingleEditor from './edit/single.vue'
import JudgeEditor from './edit/judge.vue'
import MultipleEditor from './edit/multiple.vue'
import FillEditor from './edit/fill.vue'
import SelectEditor from './edit/select.vue'
import SortEditor from './edit/sort.vue'
import ClassifyEditor from './edit/classify.vue'
import PuzzleEditor from './edit/puzzle.vue'
import HtmlEditor from './edit/html.vue'
import ShortAnswerEditor from './edit/short-answer.vue'
import MatchEditor from './edit/match.vue'
import CompositeEditor from './edit/composite.vue'
import VideoEditor from './edit/video.vue'
import AiGenerator from './edit/ai-generator.vue'
// 各题型的英文出题说明
import { promptFor } from './edit/prompts.js'

const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  questionId: { type: Number, default: 0 },
  question: { type: Object, default: null },
  courseId: { type: Number, default: undefined }, // 可选课程上下文：覆盖全局 editableCourseId（admin 后台复用时传入）
})

const emit = defineEmits(['update:modelValue', 'saved'])

// 判断是否为 Modal 模式（有 modelValue prop）
const isModal = computed(() => props.modelValue !== undefined)

// Modal 模式的 open 状态
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
// 可选 courseId prop 覆盖全局 editableCourseId（admin 后台复用时传入）
const effectiveCourseId = computed(() => props.courseId || editableCourseId.value)
const toast = useToast()

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
  { label: t('question.typeVideo'), value: 'video' },
])

// 题型 → 组件映射
const componentMap = { single: SingleEditor, judge: JudgeEditor, multiple: MultipleEditor, fill: FillEditor, select: SelectEditor, sort: SortEditor, classify: ClassifyEditor, puzzle: PuzzleEditor, html: HtmlEditor, 'short-answer': ShortAnswerEditor, match: MatchEditor, composite: CompositeEditor, video: VideoEditor }
const typeComponent = computed(() => componentMap[form.value?.type] || null)

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
let originalData = null

// ── JSON 原始数据编辑器（高级） ──
const showJsonEditor = ref(false)
const jsonText = ref('')
const jsonError = ref('')
let syncingFromForm = false
let syncingFromJson = false

// ── AI 流式生成状态（由子组件 ai-generator 驱动） ──
const aiStreaming = ref(false)
let aiGenSucceeded = false

// 当前题型的英文出题说明（用于在 JSON 编辑器下方展示）
const currentTypePrompt = computed(() => {
    const t = form.value?.type
    if (!t) return ''
    return promptFor(t) || ''
})

// 当前题型是否有对应的出题 prompt（composite / video 无 prompt，不显示 AI 出题）
const hasTypePrompt = computed(() => !!promptFor(form.value?.type))

// 复制当前题型的出题说明
const copyCopied = ref(false)
let copyCopiedTimer = null
async function copyCurrentPrompt() {
    const text = currentTypePrompt.value
    if (!text) return
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
        } else {
            // 兼容旧浏览器
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
        }
        copyCopied.value = true
        toast.add({ title: t('question.typePromptCopied'), color: 'success' })
        if (copyCopiedTimer) clearTimeout(copyCopiedTimer)
        copyCopiedTimer = setTimeout(() => { copyCopied.value = false }, 1500)
    } catch {
        toast.add({ title: t('question.typePromptCopyFailed'), color: 'error' })
    }
}

// form.value → jsonText
watch(form, (newForm) => {
    if (syncingFromJson) return
    if (!newForm) {
        jsonText.value = ''
        jsonError.value = ''
        return
    }
    syncingFromForm = true
    try {
        jsonText.value = JSON.stringify(newForm, null, 2)
        jsonError.value = ''
    } catch (e) {
        jsonError.value = e?.message || 'Serialize error'
    } finally {
        syncingFromForm = false
    }
}, { deep: true, immediate: true })

// jsonText → form.value
watch(jsonText, (newText) => {
    if (syncingFromForm) return
    // AI 流式期间禁止把（可能不完整的）流式 JSON 反写回 form，避免与 form→jsonText 形成反馈环覆盖流式输出
    if (aiStreaming.value) return
    if (!form.value) return
    if (!String(newText || '').trim()) return  // 空输入 — 跳过
    try {
        const parsed = JSON.parse(newText)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            jsonError.value = 'JSON must be an object'
            return
        }
        syncingFromJson = true
        // Update all keys present in parsed; keep form structure stable
        for (const key of Object.keys(parsed)) {
            form.value[key] = parsed[key]
        }
        jsonError.value = ''
    } catch (e) {
        jsonError.value = e?.message || 'Parse error'
    } finally {
        syncingFromJson = false
    }
})

// provide form 给 select node-view，使其能读取 options
provide('questionForm', form)

// 初始化 form
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
    case 'video':
      form.value.options = { src: '', questions: [] }
      form.value.answer = []
      form.value.content = ''
      break
  }
}

function resetForm() {
  if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
  saveMsg.value = ''
}

// AI 流式生成开始/结束（开始时打开 JSON 编辑器并重置成功标记）
function onAiStreaming(v) {
  aiStreaming.value = v
}

// AI 流式输出（已剥离 ```json 围栏的纯 JSON 片段）实时写入 jsonText → Monaco
// 注意：jsonText→form watch 被 aiStreaming 守卫跳过，不会把流式片段反写回 form
function onAiStreamText(text) {
  jsonText.value = text
}

// AI 生成的题目应用到表单（仅覆盖生成对象中存在的键，保留 record 等已有字段）
function onAiGenerated(q) {
  if (!form.value) return
  aiGenSucceeded = true
  for (const key of Object.keys(q)) {
    form.value[key] = q[key]
  }
  toast.add({ title: t('question.aiGenerateApplied'), color: 'success' })
}

// 流式开始 → 自动展开 JSON 编辑器；非成功结束（停止/出错）→ 用 form 重建 jsonText
watch(aiStreaming, (v) => {
  if (v) {
    showJsonEditor.value = true
    aiGenSucceeded = false
  } else if (!aiGenSucceeded && form.value) {
    syncingFromForm = true
    try {
      jsonText.value = JSON.stringify(form.value, null, 2)
      jsonError.value = ''
    } catch (e) {
      jsonError.value = e?.message || 'Serialize error'
    } finally {
      syncingFromForm = false
    }
  }
})

async function saveQuestion() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.questionId) {
      // 已有题目：更新
      await cRequest('/api/questions/update', {
        method: 'POST',
        body: { id: props.questionId, course_id: effectiveCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      // 新题目：新增并拿回 cid
      const result = await cRequest('/api/questions/add', {
        method: 'POST',
        body: { course_id: effectiveCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('question.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    // Modal 模式：关闭弹窗
    if (isModal.value) {
      open.value = false
    }
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('question.saveFailed')
  } finally {
    saving.value = false
  }
}

// Modal 模式：弹窗打开时初始化 form
watch(open, (val) => {
  if (val) initForm()
  else {
    form.value = null
    saveMsg.value = ''
  }
}, { immediate: true })

// 内联模式：组件加载时初始化 form
watch(() => props.question, () => {
  if (!isModal.value) initForm()
}, { immediate: true })
</script>