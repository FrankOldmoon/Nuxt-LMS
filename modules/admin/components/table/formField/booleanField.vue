<template>
  <USwitch v-model="form[col.jsName]" />
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../../utils/types'
defineProps<{ col: ColumnMeta; form: Record<string, any> }>()
</script>
