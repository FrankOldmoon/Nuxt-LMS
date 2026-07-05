<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-5xl' }">
    <UTooltip :text="$t('courseEditor.editCourse')" :content="{ side: 'bottom' }">
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-settings"
        :disabled="!canEdit"
        :aria-label="$t('courseEditor.editCourse')"
        @click.prevent.stop="openModal"
      />
    </UTooltip>

    <template #content>
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold">{{ $t('courseEditor.title') }}</h3>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-10 text-muted">
          <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
          <span class="text-sm">{{ $t('courseEditor.loading') }}</span>
        </div>

        <div v-else class="space-y-4">
          <!-- 基础信息 -->
          <UFormField :label="$t('courseEditor.name')" class="w-full">
            <UInput v-model="form.name" :placeholder="$t('courseEditor.namePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('courseEditor.code')" class="w-full">
            <UInput v-model="form.code" :placeholder="$t('courseEditor.codePlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('courseEditor.tags')" class="w-full">
            <UInputTags v-model="form.tags" :placeholder="$t('courseEditor.tagsPlaceholder')" class="w-full" />
          </UFormField>

          <!-- config 编辑 -->
          <CourseEditorConfigForm ref="configFormRef" />

          <!-- 课程内容编辑 -->
          <USeparator :label="$t('courseEditor.content')" class="my-4" />
          <Ueditor v-model="contentJson" :lock-id="lockId" />

          <!-- 教师/编辑者管理（仅管理员可见） -->
          <CourseEditorMembersManager
            v-if="hasRole('admin')"
            ref="membersRef"
            :course-id="props.courseId"
          />

          <!-- 底部按钮 -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton :label="$t('common.cancel')" color="neutral" variant="ghost" @click="closeModal" />
            <UButton :label="$t('common.save')" color="primary" :loading="saving" @click="save" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const props = defineProps<{
  courseId: number
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const { t } = useI18n()
const toast = useToast()
const { hasRole, isCourseEditor } = useAuth()

const open = ref(false)
const loading = ref(false)
const saving = ref(false)

const canEdit = computed(() => hasRole('admin') || isCourseEditor(props.courseId))
const lockId = computed(() => `courses_${props.courseId}`)

const configFormRef = ref<{ initFromConfig: (cfg: Record<string, any>) => void; buildConfig: () => Record<string, any> | null } | null>(null)
const membersRef = ref<{ loadMembers: () => Promise<void> } | null>(null)

const form = ref({
  name: '',
  code: '',
  tags: [] as string[],
})

const contentJson = ref(null)

function openModal() {
  open.value = true
}

function closeModal() {
  open.value = false
}

async function loadCourse() {
  loading.value = true
  try {
    const data = await cRequest<any>(`/api/lms/courses/show?id=${props.courseId}`)
    form.value = {
      name: data?.title || '',
      code: data?.code || '',
      tags: (data?.tags as string[]) || [],
    }
    contentJson.value = data?.content || null
    const cfg = (data?.config as Record<string, any>) || {}
    configFormRef.value?.initFromConfig(cfg)
    await membersRef.value?.loadMembers()
  } catch {
    toast.add({ title: t('courseEditor.loadFailed'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  const finalConfig = configFormRef.value?.buildConfig()
  if (!finalConfig) return

  saving.value = true
  try {
    await cRequest('/api/lms/courses/update', {
      method: 'POST',
      body: {
        id: props.courseId,
        name: form.value.name,
        code: form.value.code,
        tags: form.value.tags,
        config: finalConfig,
        content: contentJson.value,
      },
    })
    toast.add({ title: t('courseEditor.saveSuccess'), color: 'success' })
    emit('saved')
    closeModal()
  } catch (e: any) {
    toast.add({ title: e.message || t('courseEditor.saveFailed'), color: 'error' })
  } finally {
    saving.value = false
  }
}

watch(open, (val) => {
  if (val) loadCourse()
})
</script>
