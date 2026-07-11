<template>
  <UInput
    v-model="form[col.jsName]"
    :type="isDateTime(col) ? 'datetime-local' : 'date'"
    size="sm"
    class="w-full"
  />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
function isDateTime(col: ColumnMeta) { return col.columnType === 'PgTimestamp' }
</script>
