<template>
  <!-- Modal 模式(预览模式,有 modelValue) -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('race.namePlaceholder') }}</h2>

        <!-- 基本配置 -->
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="$t('race.namePlaceholder')" size="sm">
            <UInput v-model="form.name" :placeholder="$t('race.namePlaceholder')" size="sm" class="w-full" />
          </UFormField>
          <UFormField :label="$t('race.point')" size="sm">
            <UInput v-model.number="form.point" type="number" size="sm" />
          </UFormField>
          <UFormField :label="$t('race.gapTime')" size="sm">
            <UInput v-model.number="form.gapTime" type="number" size="sm" />
          </UFormField>
        </div>

        <!-- 题目选择 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ $t('race.questionsLabel') }} ({{ form.questionIds.length }})</label>
            <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="$t('race.selectQuestions')" @click="pickerOpen = true" />
          </div>
          <div v-if="form.questionIds.length" class="space-y-1 max-h-48 overflow-y-auto">
            <div v-for="(q, idx) in form.questionIds" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
              <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400" />
              <span class="text-sm flex-1">{{ $t('courseData.questionLabel') }} #{{ q.id }}</span>
              <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questionIds.splice(idx, 1)" />
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">{{ $t('race.noQuestions') }}</p>
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
          <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="() => { open = false }">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveRace">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式(编辑器模式,无 modelValue) -->
  <div v-else-if="form" class="p-6 space-y-4">
    <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('race.namePlaceholder') }}</h2>

    <!-- 基本配置 -->
    <div class="grid grid-cols-2 gap-3">
      <UFormField :label="$t('race.namePlaceholder')" size="sm">
        <UInput v-model="form.name" :placeholder="$t('race.namePlaceholder')" size="sm" class="w-full" />
      </UFormField>
      <UFormField :label="$t('race.point')" size="sm">
        <UInput v-model.number="form.point" type="number" size="sm" />
      </UFormField>
      <UFormField :label="$t('race.gapTime')" size="sm">
        <UInput v-model.number="form.gapTime" type="number" size="sm" />
      </UFormField>
    </div>

    <!-- 题目选择 -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">{{ $t('race.questionsLabel') }} ({{ form.questionIds.length }})</label>
        <UButton size="xs" variant="outline" icon="i-lucide-plus" :label="$t('race.selectQuestions')" @click="pickerOpen = true" />
      </div>
      <div v-if="form.questionIds.length" class="space-y-1 max-h-48 overflow-y-auto">
        <div v-for="(q, idx) in form.questionIds" :key="idx" class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded">
          <UIcon name="i-lucide-circle-help" class="size-4 text-gray-400" />
          <span class="text-sm flex-1">{{ $t('courseData.questionLabel') }} #{{ q.id }}</span>
          <UButton icon="i-lucide-x" color="error" variant="ghost" size="2xs" @click="form.questionIds.splice(idx, 1)" />
        </div>
      </div>
      <p v-else class="text-sm text-gray-400">{{ $t('race.noQuestions') }}</p>
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
      <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
      <UButton color="primary" :loading="saving" @click="saveRace">{{ $t('common.save') }}</UButton>
    </div>
  </div>

  <!-- 题目选择器 -->
  <UeditorContentPicker v-model="pickerOpen" type="questions" @confirm="onPickQuestions" />
</template>

<script setup>
const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  raceId: { type: Number, default: 0 },
  race: { type: Object, default: null },
  courseId: { type: [Number, String], default: undefined }, // admin 后台复用时传入
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
const { editableCourseId, setEditableMeta } = useLayoutState()
const effectiveCourseId = computed(() => {
  if (props.courseId !== undefined && props.courseId !== null && props.courseId !== '') {
    return Number(props.courseId) || 0
  }
  return editableCourseId.value
})

// 组件挂载期间临时设置 editableCourseId
let prevCourseId = 0
let prevTable = ''
let prevId = 0
onMounted(() => {
  if (effectiveCourseId.value) {
    prevCourseId = editableCourseId.value
    setEditableMeta('races', props.raceId || 0, effectiveCourseId.value)
  }
})
onBeforeUnmount(() => {
  if (prevCourseId !== editableCourseId.value) {
    setEditableMeta(prevTable, prevId, prevCourseId)
  }
})

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
const pickerOpen = ref(false)
let originalData = null

function initForm() {
  if (!props.race) {
    form.value = {
      name: '',
      point: 100,
      gapTime: 30,
      questionIds: [],
    }
    originalData = JSON.parse(JSON.stringify(form.value))
    return
  }
  const raw = Array.isArray(props.race.questionIds) ? props.race.questionIds : []
  const normalized = {
    name: props.race.name || '',
    point: Number(props.race.point) || 100,
    gapTime: Number(props.race.gapTime) || 30,
    questionIds: raw.map(item => typeof item === 'number' ? { id: item } : { id: Number(item.id) }).filter(q => q.id > 0),
  }
  form.value = normalized
  originalData = JSON.parse(JSON.stringify(normalized))
}

function onPickQuestions(cids) {
  for (const cid of cids) {
    if (!form.value.questionIds.some(q => q.id === cid)) {
      form.value.questionIds.push({ id: cid })
    }
  }
}

function resetForm() {
  if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
  saveMsg.value = ''
}

async function saveRace() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.raceId) {
      // 已有竞赛：更新
      await cRequest('/api/races/update', {
        method: 'POST',
        body: { id: props.raceId, course_id: effectiveCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: props.raceId })
    } else {
      // 新竞赛：新增并拿回 cid
      const result = await cRequest('/api/races/add', {
        method: 'POST',
        body: { course_id: effectiveCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('race.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    // Modal 模式：关闭弹窗
    if (isModal.value) {
      open.value = false
    }
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('race.saveFailed')
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
watch(() => props.race, () => {
  if (!isModal.value) initForm()
}, { immediate: true })
</script>