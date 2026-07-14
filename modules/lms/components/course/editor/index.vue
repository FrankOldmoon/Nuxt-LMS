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

        <div v-show="!loading" class="space-y-4">
          <!-- 课程内容编辑 -->
          <USeparator :label="$t('courseEditor.content')" class="my-4" />
          <richEditor v-model="contentJson" :lock-id="lockId" />
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

          <!-- 教师/编辑者管理（仅管理员可见） -->
          <CourseEditorMembersManager
            v-if="hasRole('admin')"
            ref="membersRef"
            :course-id="props.courseId"
          />

          <!-- 课程专属商品管理（教师/管理员可见） -->
          <LmsGoodsEditor v-if="canEdit" :course-id="props.courseId" />

          <!-- 全局商品管理（仅管理员可见） -->
          <LmsGoodsEditor v-if="hasRole('admin')" :course-id="0" />

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

const { hasRole } = useAuth()

const {
  open,
  loading,
  saving,
  canEdit,
  lockId,
  form,
  contentJson,
  configFormRef,
  membersRef,
  openModal,
  closeModal,
  save,
} = useCourseEditor(props, emit)
</script>
