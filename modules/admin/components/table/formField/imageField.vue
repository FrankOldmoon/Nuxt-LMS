<template>
  <div class="flex items-center gap-2">
    <UInput v-model="form[col.jsName]" size="sm" class="flex-1" placeholder="https://..." />
    <UAvatar v-if="form[col.jsName]" :src="String(form[col.jsName])" size="sm" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
</script>
