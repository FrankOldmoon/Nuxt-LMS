<template>
  <TableFormFieldDateField v-if="widget === 'date'" :col :form />
  <TableFormFieldBooleanField v-else-if="widget === 'boolean'" :col :form />
  <TableFormFieldSelectField v-else-if="widget === 'select'" :col :form />
  <TableFormFieldFkField v-else-if="widget === 'fk'" :col :form :fk-options :fk-loading />
  <TableFormFieldNumberField v-else-if="widget === 'number'" :col :form />
  <TableFormFieldRichEditorField v-else-if="widget === 'richEditor'" :col :form :json-strings :json-errors :row-course-id />
  <TableFormFieldJsonField v-else-if="widget === 'json'" :col :json-strings :json-errors />
  <TableFormFieldIconField v-else-if="widget === 'icon'" :col :form />
  <TableFormFieldFileField v-else-if="widget === 'file'" :col :form />
  <TableFormFieldImageCropperField v-else-if="widget === 'imageCropper'" :col :form />
  <TableFormFieldImageField v-else-if="widget === 'image'" :col :form />
  <TableFormFieldPasswordField v-else-if="widget === 'password'" :col :form />
  <TableFormFieldTextField v-else :col :form />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'
import { widgetFor } from '../../utils/widgetMap'

const props = defineProps<{
  col: ColumnMeta
  form: Record<string, any>
  jsonStrings: Record<string, string>
  jsonErrors: Record<string, boolean>
  fkOptions: Record<string, { id: number; label: string }[]>
  fkLoading: Record<string, boolean>
  rowCourseId?: number
}>()

const widget = computed(() => widgetFor(props.col))
</script>
