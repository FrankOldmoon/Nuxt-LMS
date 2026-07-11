<template>
  <ClientOnly>
    <component
      :is="richEditorComp"
      v-if="richEditorComp"
      v-model="form[col.jsName]"
      :course-id="rowCourseId"
    />
    <UTextarea
      v-else
      v-model="jsonStrings[col.jsName]"
      :rows="4"
      size="sm"
      class="w-full font-mono text-xs"
      placeholder='{ }'
    />
    <template #fallback>
      <UTextarea
        v-model="jsonStrings[col.jsName]"
        :rows="4"
        size="sm"
        class="w-full font-mono text-xs"
        placeholder='{ }'
      />
    </template>
  </ClientOnly>
  <div v-if="jsonErrors[col.jsName]" class="text-xs text-error mt-1">
    {{ t('admin.form.invalidJson') }}
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'

const props = defineProps<{
  col: ColumnMeta
  form: Record<string, any>
  jsonStrings: Record<string, string>
  jsonErrors: Record<string, boolean>
  rowCourseId?: number
}>()

const { t } = useI18n()

/** RichEditor 组件（LMS 提供），lms 未启用时回退 JSON 文本域 */
const richEditorComp = computed(() => {
  if (!useRuntimeConfig().public.moduleLms) return null
  try { return resolveComponent('RichEditor') }
  catch { return null }
})
</script>
