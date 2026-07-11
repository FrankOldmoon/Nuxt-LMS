<template>
  <UInput v-model="form[col.jsName]" size="sm" class="w-full" />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
</script>
