<template>
  <UModal v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('common.edit') }} - {{ form.name || $t('homework.namePlaceholder') }}</h2>

        <!-- 名称 / 代码 / 分值 -->
        <div class="flex items-center gap-3">
          <UInput v-model="form.name" :placeholder="$t('homework.namePlaceholder')" class="flex-1" size="sm" />
          <UInput v-model="form.code" :placeholder="$t('homework.codePlaceholder')" size="sm" class="w-32" />
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
          <FormInputTags v-model="form.tags" :placeholder="$t('question.tagPlaceholder')" :add-text="$t('question.addTag')" />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="()=>{open = false}">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="saveHomework">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  homeworkId: { type: Number, default: 0 },
  homework: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

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

// 弹窗打开时从 props.homework 深拷贝初始化 form
function initForm() {
  if (!props.homework) {
    form.value = null
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
      await cRequest('/api/lms/homeworks/update', {
        method: 'POST',
        body: { id: props.homeworkId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      // 新作业：新增并拿回 cid
      const result = await cRequest('/api/lms/homeworks/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('homework.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    open.value = false
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('homework.saveFailed')
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
