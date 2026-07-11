<template>
  <USelectMenu
    v-model="form[col.jsName]"
    :items="fkOptions[col.jsName] || []"
    value-key="id"
    option-attribute="label"
    :placeholder="t('admin.form.selectFk')"
    :loading="fkLoading[col.jsName]"
    searchable
    size="sm"
    class="w-full"
  />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{
  col: ColumnMeta
  form: Record<string, any>
  fkOptions: Record<string, { id: number; label: string }[]>
  fkLoading: Record<string, boolean>
}>()
const { t } = useI18n()
</script>
