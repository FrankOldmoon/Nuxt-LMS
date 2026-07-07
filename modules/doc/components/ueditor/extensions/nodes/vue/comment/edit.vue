<template>
  <UModal v-model:open="open" scrollable>
    <template #content>
      <div v-if="form" class="p-6 space-y-4">
        <h2 class="text-lg font-semibold">{{ $t('comment.editTitle') }}</h2>

        <!-- 名称 + 分值 -->
        <div class="flex items-center gap-3">
          <UInput v-model="form.name" :placeholder="$t('comment.namePlaceholder')" class="flex-1" size="sm" />
          <UInput v-model.number="form.point" type="number" :placeholder="$t('question.pointPlaceholder')" size="sm" class="w-20" />
        </div>

        <!-- 评论内容 -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('comment.contentLabel') }}</label>
          <richEditor v-model="form.content" />
        </div>

        <!-- 标签 -->
        <div>
          <label class="text-xs text-gray-500 mb-1 block">{{ $t('comment.tagsLabel') }}</label>
          <UInputTags v-model="form.tags" :placeholder="$t('comment.tagPlaceholder')" />
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <span v-if="saveMsg" class="text-xs self-center" :class="saveOk ? 'text-green-500' : 'text-red-500'">{{ saveMsg }}</span>
          <UButton variant="soft" @click="resetForm">{{ $t('common.reset') }}</UButton>
          <UButton variant="soft" @click="()=>{open = false}">{{ $t('common.cancel') }}</UButton>
          <UButton color="primary" :loading="saving" @click="save">{{ $t('common.save') }}</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  commentId: { type: Number, default: 0 },
  comment: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()

const saving = ref(false)
const saveMsg = ref('')
const saveOk = ref(true)
const form = ref(null)
let originalData = null

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function initForm() {
  if (!props.comment) {
    form.value = {
      name: '',
      content: '',
      tags: [],
      point: 1,
    }
    originalData = JSON.parse(JSON.stringify(form.value))
    return
  }
  const normalized = {
    name: props.comment.name || '',
    content: props.comment.content || '',
    tags: Array.isArray(props.comment.tags) ? [...props.comment.tags] : [],
    point: Number(props.comment.point) || 0,
  }
  form.value = normalized
  originalData = JSON.parse(JSON.stringify(normalized))
}

function resetForm() {
  if (originalData) form.value = JSON.parse(JSON.stringify(originalData))
  saveMsg.value = ''
}

async function save() {
  if (!form.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    if (props.commentId) {
      await cRequest('/api/comments/update', {
        method: 'POST',
        body: { id: props.commentId, course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', form.value)
    } else {
      const result = await cRequest('/api/comments/add', {
        method: 'POST',
        body: { course_id: editableCourseId.value, ...form.value },
      })
      emit('saved', { ...form.value, cid: result.cid })
    }
    saveOk.value = true
    saveMsg.value = t('comment.saveSuccess')
    originalData = JSON.parse(JSON.stringify(form.value))
    open.value = false
  } catch (err) {
    saveOk.value = false
    saveMsg.value = err.message || t('comment.saveFailed')
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
