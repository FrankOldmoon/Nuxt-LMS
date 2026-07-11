<template>
  <UTextarea
    v-model="jsonStrings[col.jsName]"
    :rows="4"
    size="sm"
    class="w-full font-mono text-xs"
    placeholder='{ }'
  />
  <div v-if="jsonErrors[col.jsName]" class="text-xs text-error mt-1">
    {{ t('admin.form.invalidJson') }}
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{
  col: ColumnMeta
  jsonStrings: Record<string, string>
  jsonErrors: Record<string, boolean>
}>()
const { t } = useI18n()
</script>
