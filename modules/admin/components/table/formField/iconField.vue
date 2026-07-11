<template>
  <div class="flex items-center gap-2">
    <FormInputIcon v-model="form[col.jsName]" size="sm" :placeholder="t('admin.form.selectIcon')" />
    <UInput v-model="form[col.jsName]" size="sm" class="flex-1" :placeholder="t('admin.form.iconName')" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
const { t } = useI18n()
</script>
