<template>
  <div class="flex items-center justify-between gap-2">
    <USelect
      :model-value="pageSize"
      :items="pageSizeOptions"
      value-key="value"
      size="xs"
      class="w-28"
      @update:model-value="(v: number) => emit('set-page-size', v)"
    />
    <UPagination
      :page="page"
      :total="total"
      :items-per-page="pageSize"
      :sibling-count="1"
      @update:page="emit('set-page', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  page: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  'set-page': [page: number]
  'set-page-size': [size: number]
}>()

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
]
</script>
