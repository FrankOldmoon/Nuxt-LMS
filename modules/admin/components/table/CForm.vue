<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }" scrollable>
    <template #content>
      <component
        v-if="hasFormOverride"
        :is="override.form"
        :row="row"
        @saved="(d) => { emit('saved', d); open = false }"
        @cancel="open = false"
      />
      <div v-else class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">
            {{ isEdit ? t('admin.table.editRecord') : t('admin.table.addNew') }}
          </h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
        </div>

        <div class="space-y-3 max-h-[65vh] overflow-auto pr-1">
          <UFormField
            v-for="col in editableColumns"
            :key="col.jsName"
            :label="col.jsName"
            :required="col.notNull && !col.hasDefault"
            :description="col.fkTable ? `→ ${col.fkTable}` : col.dataType"
          >
            <TableFormField
              :col="col" :form="form" :json-strings="jsonStrings" :json-errors="jsonErrors"
              :fk-options="fkOptions" :fk-loading="fkLoading" :row-course-id="rowCourseId"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="open = false" />
          <UButton color="primary" :label="t('admin.form.save')" :loading="saving" @click="onSubmit" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'
import { widgetFor } from '../../utils/widgetMap'

const props = defineProps<{
  tableName: string
  columns: ColumnMeta[]
  row: Record<string, any> | null
}>()

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  saved: [data: any]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const { override, hasFormOverride } = useTableOverride(() => props.tableName)

const isEdit = computed(() => !!props.row)
const editableColumns = computed(() => props.columns.filter((c) => widgetFor(c) !== 'readonly'))

/** 从行数据推导 courseId（RichEditor 需要） */
const rowCourseId = computed(() => {
  const r: any = props.row
  if (!r) return undefined
  const v = r.courseId ?? r.course_id
  return v === undefined || v === null || v === '' ? undefined : Number(v) || undefined
})

const { form, jsonStrings, jsonErrors, fkOptions, fkLoading, saving, onSubmit } =
  useCForm(editableColumns, computed(() => props.row), emit, open)
</script>
