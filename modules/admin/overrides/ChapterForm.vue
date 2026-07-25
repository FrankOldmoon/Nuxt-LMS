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
import { useChapterForm } from './useChapterForm'

const props = defineProps<{
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  saved: [data: any]
  cancel: []
}>()

const {
  t, richEditorComp, isEdit, form, selectedCourseId, courseOptions,
  courseLoading, effectiveCourseId, saving, contentJsonString, contentError, onSave,
} = useChapterForm(props, emit as any)
</script>
