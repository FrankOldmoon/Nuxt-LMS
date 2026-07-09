<template>
  <!-- Modal 模式（预览模式，有 modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ form.name || $t('quiz.namePlaceholder') }}</h2>

        <!-- 基本配置 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('quiz.namePlaceholder')" size="sm">
            <UInput v-model="form.name" :placeholder="$t('quiz.namePlaceholder')" size="sm" class="w-full" />
          </UFormField>
          <UFormField :label="$t('quiz.timeLimit')" size="sm">
            <UInput v-model.number="form.timeLimit" type="number" size="sm" />
          </UFormField>
          <UFormField :label="$t('quiz.submitLimit')" size="sm">
            <UInput v-model.number="form.submitLimit" type="number" size="sm" />
          </UFormField>
          <UFormField :label="$t('quiz.totalPoint')" size="sm">
            <UInput :model-value="totalPoint" type="number" size="sm" disabled />
          </UFormField>
          <UFormField :label="$t('quiz.startAt')" size="sm">
            <UInput v-model="form.startAt" type="datetime-local" size="sm" />
          </UFormField>
          <UFormField :label="$t('quiz.endAt')" size="sm">
            <UInput v-model="form.endAt" type="datetime-local" size="sm" />
          </UFormField>
        </div>

        <!-- 测验内容 -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('quiz.contentLabel') }}</label>
          <richEditor v-model="form.content" />
        </div>

        <!-- 题目选择 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ $t('quiz.questionsLabel') }} ({{ form.questions.length }})</label>
            <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="$t('quiz.selectQuestions')" @click="pickerOpen = true" />
          </div>
          <div v-if="form.questions.length" class="space-y-1 max-h-60 overflow-y-auto">
            <div v-for="(q, idx) in form.questions" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
              <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400 shrink-0" />
              <span class="text-sm flex-1">{{ $t('courseData.questionLabel') }} #{{ q.id }}</span>
              <UInput v-model.number="q.point" type="number" size="xs" class="w-20" :placeholder="$t('quiz.perQuestionPoint')" />
              <span class="text-xs text-gray-400">{{ $t('question.points') }}</span>
              <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questions.splice(idx, 1)" />
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">{{ $t('quiz.noQuestions') }}</p>
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
            <Monaco v-model="jsonText" language="json" :auto-format="true" />
          </div>
          <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">
            {{ $t('question.jsonHint') }}
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="() => { open = false }">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveQuiz">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式（编辑器模式，无 modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <h2 class="text-lg font-semibold">{{ form.name || $t('quiz.namePlaceholder') }}</h2>

    <!-- 基本配置 -->
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('quiz.namePlaceholder')" size="sm">
        <UInput v-model="form.name" :placeholder="$t('quiz.namePlaceholder')" size="sm" class="w-full" />
      </UFormField>
      <UFormField :label="$t('quiz.timeLimit')" size="sm">
        <UInput v-model.number="form.timeLimit" type="number" size="sm" />
      </UFormField>
      <UFormField :label="$t('quiz.submitLimit')" size="sm">
        <UInput v-model.number="form.submitLimit" type="number" size="sm" />
      </UFormField>
      <UFormField :label="$t('quiz.totalPoint')" size="sm">
        <UInput :model-value="totalPoint" type="number" size="sm" disabled />
      </UFormField>
      <UFormField :label="$t('quiz.startAt')" size="sm">
        <UInput v-model="form.startAt" type="datetime-local" size="sm" />
      </UFormField>
      <UFormField :label="$t('quiz.endAt')" size="sm">
        <UInput v-model="form.endAt" type="datetime-local" size="sm" />
      </UFormField>
    </div>

    <!-- 测验内容 -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('quiz.contentLabel') }}</label>
      <richEditor v-model="form.content" />
    </div>

    <!-- 题目选择 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">{{ $t('quiz.questionsLabel') }} ({{ form.questions.length }})</label>
        <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="$t('quiz.selectQuestions')" @click="pickerOpen = true" />
      </div>
      <div v-if="form.questions.length" class="space-y-1 max-h-60 overflow-y-auto">
        <div v-for="(q, idx) in form.questions" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
          <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400 shrink-0" />
          <span class="text-sm flex-1">{{ $t('courseData.questionLabel') }} #{{ q.id }}</span>
          <UInput v-model.number="q.point" type="number" size="xs" class="w-20" :placeholder="$t('quiz.perQuestionPoint')" />
          <span class="text-xs text-gray-400">{{ $t('question.points') }}</span>
          <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questions.splice(idx, 1)" />
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">{{ $t('quiz.noQuestions') }}</p>
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
        <Monaco v-model="jsonText" language="json" :auto-format="true" />
      </div>
      <p v-if="showJsonEditor" class="text-xs text-gray-400 mt-1">
        {{ $t('question.jsonHint') }}
      </p>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
      <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
      <UButton color="primary" :loading="saving" @click="saveQuiz">{{ $t('common.save') }}</UButton>
    </div>
  </div>

  <!-- 题目选择器 -->
  <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
</template>

<script setup>
const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  quizId: { type: Number, default: 0 },
  quiz: { type: Object, default: null },
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

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
const pickerOpen = ref(false)

// 自动汇总总分
const totalPoint = computed(() => {
  if (!form.value?.questions) return 0
  return form.value.questions.reduce((sum, q) => sum + (Number(q.point) || 0), 0)
})

/** 规范化 questions 为 [{id, point}] 格式（兼容旧版 [id] 格式） */
function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (typeof item === 'number') return { id: item, point: 1 }
    if (item && typeof item === 'object') return { id: Number(item.id), point: Number(item.point) || 1 }
    return { id: 0, point: 1 }
  }).filter(q => q.id > 0)
}

function initForm() {
  if (!props.quiz) {
    form.value = {
      name: '',
      timeLimit: 600,
      submitLimit: 1,
      startAt: '',
      endAt: '',
      questions: [],
      content: '',
    }
    return
  }
  const normalized = {
    name: props.quiz.name || '',
    timeLimit: Number(props.quiz.timeLimit) || 600,
    submitLimit: Number(props.quiz.submitLimit) || 1,
    startAt: props.quiz.startAt ? formatDateTime(props.quiz.startAt) : '',
    endAt: props.quiz.endAt ? formatDateTime(props.quiz.endAt) : '',
    questions: normalizeQuestions(props.quiz.questions),
    content: props.quiz.content || '',
  }
  form.value = normalized
}

function formatDateTime(d) {
  const date = new Date(d)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function onPickQuestions(cids) {
  for (const cid of cids) {
    if (!form.value.questions.some(q => q.id === cid)) {
      form.value.questions.push({ id: cid, point: 1 })
    }
  }
}

async function saveQuiz() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    const payload = { ...form.value }
    // 空字符串转为 null（服务端中间件自动将日期字段字符串转为 Date）
    if (!payload.startAt) payload.startAt = null
    if (!payload.endAt) payload.endAt = null
    // 自动汇总总分
    payload.point = totalPoint.value

    if (props.quizId) {
      await cRequest('/api/quizzes/update', {
        method: 'POST',
        body: { id: props.quizId, course_id: editableCourseId.value, ...payload },
      })
      emit('saved', { ...form.value, cid: props.quizId, point: totalPoint.value })
    } else {
      const result = await cRequest('/api/quizzes/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...payload },
      })
      emit('saved', { ...form.value, cid: result.cid, point: totalPoint.value })
    }
    saveOk.value = true
    saveMsg.value = t('quiz.saveSuccess')
    // Modal 模式：关闭弹窗
    if (isModal.value) {
      open.value = false
    }
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('quiz.saveFailed')
  } finally {
    saving.value = false
  }
}

// ── JSON 原始数据编辑器（高级） ──
const showJsonEditor = ref(false)
const jsonText = ref('')
const jsonError = ref('')
let syncingFromForm = false
let syncingFromJson = false

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
  if (!form.value) return
  if (!String(newText || '').trim()) return
  try {
    const parsed = JSON.parse(newText)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      jsonError.value = 'JSON must be an object'
      return
    }
    syncingFromJson = true
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

// Modal 模式：弹窗打开时初始化 form
watch(open, (val) => {
  if (val) initForm()
  else {
    form.value = null
    saveMsg.value = ''
  }
}, { immediate: true })

// 内联模式：组件加载时初始化 form
watch(() => props.quiz, () => {
  if (!isModal.value) initForm()
}, { immediate: true })
</script>
