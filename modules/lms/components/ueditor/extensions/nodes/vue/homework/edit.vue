<template>
  <!-- Modal 模式（预览模式，有 modelValue） -->
  <UModal v-if="isModal" v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('homework.namePlaceholder') }}</h2>

        <!-- 名称 / 分值 -->
        <div class="flex items-center gap-3">
          <UInput v-model="form.name" :placeholder="$t('homework.namePlaceholder')" class="flex-1" size="sm" />
          <UInput v-model.number="form.point" type="number" :placeholder="$t('question.pointPlaceholder')" size="sm" class="w-20" />
        </div>

        <!-- 作业内容 -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.contentLabel') }}</label>
          <richEditor v-model="form.content" />
        </div>

        <!-- 答案解析 -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.explanationLabel') }}</label>
          <richEditor v-model="form.explanation" />
        </div>

        <!-- 标签 -->
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
          <UButton color="primary" :loading="saving" @click="saveHomework">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- 内联面板模式（编辑器模式，无 modelValue） -->
  <div v-else-if="form" class="p-6 space-y-4">
    <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('homework.namePlaceholder') }}</h2>

    <!-- 名称 / 分值 -->
    <div class="flex items-center gap-3">
      <UInput v-model="form.name" :placeholder="$t('homework.namePlaceholder')" class="flex-1" size="sm" />
      <UInput v-model.number="form.point" type="number" :placeholder="$t('question.pointPlaceholder')" size="sm" class="w-20" />
    </div>

    <!-- 作业内容 -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.contentLabel') }}</label>
      <richEditor v-model="form.content" />
    </div>

    <!-- 答案解析 -->
    <div>
      <label class="text-xs text-gray-500 mb-1 block">{{ $t('question.explanationLabel') }}</label>
      <richEditor v-model="form.explanation" />
    </div>

    <!-- 标签 -->
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
      <UButton color="primary" :loading="saving" @click="saveHomework">{{ $t('common.save') }}</UButton>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  // Modal 模式：通过 v-model 控制
  modelValue: { type: Boolean, default: undefined },
  homeworkId: { type: Number, default: 0 },
  homework: { type: Object, default: null },
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
let originalData = null

// 从 props.homework 深拷贝初始化 form
function initForm() {
  if (!props.homework) {
    form.value = {
      name: '',
      code: '',
      content: '',
      point: 1,
      tags: [],
      explanation: '',
    }
    originalData = JSON.parse(JSON.stringify(form.value))
    return
  }
  const normalized = {
    name: props.homework.name || '',
    code: props.homework.code || '',
    content: props.homework.content || '',
    point: Number(props.homework.point) || 0,
    tags: Array.isArray(props.homework.tags) ? [...props.homework.tags] : [],
    explanation: props.homework.explanation || '',
  }
  form.value = normalized
  originalData = JSON.parse(JSON.stringify(normalized))
}

function resetForm() {
  if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
  saveMsg.value = ''
}

async function saveHomework() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.homeworkId) {
      // 已有作业：更新
      await cRequest('/api/homeworks/update', {
        method: 'POST',
        body: { id: props.homeworkId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      // 新作业：新增并拿回 cid
      const result = await cRequest('/api/homeworks/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('homework.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    // Modal 模式：关闭弹窗
    if (isModal.value) {
      open.value = false
    }
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('homework.saveFailed')
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
watch(() => props.homework, () => {
  if (!isModal.value) initForm()
}, { immediate: true })
</script>
