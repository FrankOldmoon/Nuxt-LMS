<template>
  <USelect
    v-model="form[col.jsName]"
    :items="col.enumValues?.map((v) => ({ label: v, value: v }))"
    value-key="value"
    :placeholder="t('admin.form.selectFk')"
    size="sm"
    class="w-full"
  />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
const { t } = useI18n()
</script>
