<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold">
        {{ isEdit ? t('admin.table.editRecord') : t('admin.table.addNew') }}
      </h3>
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="$emit('cancel')" />
    </div>

    <!-- 新增模式：先选课程，再进入编辑器 -->
    <div v-if="!row && !selectedCourseId" class="space-y-3">
      <h4 class="text-sm font-medium">{{ t('admin.form.selectCourse') }}</h4>
      <USelectMenu
        v-model="selectedCourseId"
        :items="courseOptions"
        value-key="id"
        option-attribute="label"
        :placeholder="t('admin.form.selectCourse')"
        :loading="courseLoading"
        searchable
        size="sm"
        class="w-full"
      />
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="$emit('cancel')" />
      </div>
    </div>

    <!-- 编辑 / 已选课程：渲染表单字段 -->
    <div v-else class="space-y-3 max-h-[70vh] overflow-auto pr-1">
      <!-- name -->
      <UFormField label="name" :required="true">
        <UInput v-model="form.name" size="sm" class="w-full" />
      </UFormField>

      <!-- content：使用 RichEditor（ueditor），传入 courseId 让内部 question/homework 等节点能加载 -->
      <UFormField label="content" description="jsonb">
        <ClientOnly>
          <component
            :is="richEditorComp"
            v-if="richEditorComp"
            v-model="form.content"
            :course-id="effectiveCourseId"
          />
          <UTextarea
            v-else
            v-model="contentJsonString"
            :rows="6"
            size="sm"
            class="w-full font-mono text-xs"
            placeholder='{ "type": "doc" }'
          />
          <template #fallback>
            <UTextarea
              v-model="contentJsonString"
              :rows="6"
              size="sm"
              class="w-full font-mono text-xs"
              placeholder='{ "type": "doc" }'
            />
          </template>
        </ClientOnly>
        <div v-if="contentError" class="text-xs text-error mt-1">
          {{ t('admin.form.invalidJson') }}
        </div>
      </UFormField>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-2 pt-2 border-t border-default/50">
        <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="$emit('cancel')" />
        <UButton color="primary" :label="t('admin.form.save')" :loading="saving" @click="onSave" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps<{
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  saved: [data: any]
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()

/** RichEditor 组件（LMS 提供） */
const richEditorComp = computed(() => {
  if (!useRuntimeConfig().public.moduleLms) return null
  try {
    return resolveComponent('RichEditor')
  } catch {
    return null
  }
})

const isEdit = computed(() => !!props.row)

const form = reactive<Record<string, any>>({
  name: '',
  content: null,
})

// 新增模式下，强制先选择课程
const selectedCourseId = ref<number | undefined>(undefined)
const courseOptions = ref<{ id: number; label: string }[]>([])
const courseLoading = ref(false)

// 推导 courseId：编辑模式 → 行的 courseId；新增模式 → 用户选择的 selectedCourseId
const effectiveCourseId = computed(() => {
  if (isEdit.value) {
    const v = props.row?.courseId ?? props.row?.course_id
    if (v !== undefined && v !== null && v !== '') return Number(v) || undefined
  }
  return selectedCourseId.value ? Number(selectedCourseId.value) : undefined
})

const saving = ref(false)

// 初始化 form
watch(
  () => props.row,
  (r) => {
    if (r) {
      form.name = r.name || ''
      form.content = r.content ?? { type: 'doc', content: [] }
    } else {
      form.name = ''
      form.content = { type: 'doc', content: [] }
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (!isEdit.value) {
    courseLoading.value = true
    try {
      const opts = await cRequest<{ id: number; label: string }[]>(
        '/api/admin/fk-options?table=courses&label=name',
      )
      courseOptions.value = opts || []
    } catch {
      courseOptions.value = []
    } finally {
      courseLoading.value = false
    }
  }
})

// JSON 字符串（fallback）
const contentJsonString = ref('')
const contentError = ref(false)
watch(
  () => form.content,
  (v) => {
    try {
      contentJsonString.value = v == null ? '' : JSON.stringify(v, null, 2)
      contentError.value = false
    } catch {
      contentError.value = true
    }
  },
  { immediate: true },
)
watch(contentJsonString, (s) => {
  if (!richEditorComp.value && s) {
    try {
      form.content = s.trim() ? JSON.parse(s) : null
      contentError.value = false
    } catch {
      contentError.value = true
    }
  }
})

async function onSave() {
  if (!form.name) {
    toast.add({ title: 'name: ' + t('admin.form.required'), color: 'error' })
    return
  }
  if (!effectiveCourseId.value) {
    toast.add({ title: 'courseId: ' + t('admin.form.required'), color: 'error' })
    return
  }
  saving.value = true
  try {
    emit('saved', {
      ...form,
      courseId: effectiveCourseId.value,
    })
  } finally {
    saving.value = false
  }
}
</script>
