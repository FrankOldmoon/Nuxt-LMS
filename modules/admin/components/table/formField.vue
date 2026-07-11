<template>
  <FormFieldDate v-if="widget === 'date'" :col :form />
  <FormFieldBoolean v-else-if="widget === 'boolean'" :col :form />
  <FormFieldSelect v-else-if="widget === 'select'" :col :form />
  <FormFieldFk v-else-if="widget === 'fk'" :col :form :fk-options :fk-loading />
  <FormFieldNumber v-else-if="widget === 'number'" :col :form />
  <FormFieldRichEditor v-else-if="widget === 'richEditor'" :col :form :json-strings :json-errors :row-course-id />
  <FormFieldJson v-else-if="widget === 'json'" :col :json-strings :json-errors />
  <FormFieldIcon v-else-if="widget === 'icon'" :col :form />
  <FormFieldFile v-else-if="widget === 'file'" :col :form />
  <FormFieldImageCropper v-else-if="widget === 'imageCropper'" :col :form />
  <FormFieldImage v-else-if="widget === 'image'" :col :form />
  <FormFieldPassword v-else-if="widget === 'password'" :col :form />
  <FormFieldText v-else :col :form />
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
