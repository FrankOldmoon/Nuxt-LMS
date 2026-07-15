<template>
  <div class="space-y-2">
    <!-- Search box -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        :model-value="search"
        icon="i-lucide-search"
        :placeholder="t('admin.table.search')"
        size="sm"
        class="flex-1 min-w-[200px]"
        @update:model-value="onSearch"
      />
    </div>

    <!-- Multi-condition filtering -->
    <div v-if="filters.length > 0" class="space-y-1">
      <TableFilterRow
        v-for="(f, idx) in filters"
        :key="idx"
        :filter="f"
        :columns="columns"
        @remove="removeFilter(idx)"
      />
    </div>

    <div class="flex items-center gap-2">
      <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" :label="t('admin.table.filterAdd')" @click="addFilter" />
      <UButton
        v-if="filters.length > 0"
        color="neutral"
        variant="ghost"
        size="xs"
        :label="t('admin.table.filterClear')"
        @click="clearFilters"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta, FilterCondition } from '../../utils/types'

const props = defineProps<{
  columns: ColumnMeta[]
  filters: FilterCondition[]
  search: string
}>()

const emit = defineEmits<{
  'update:filters': [filters: FilterCondition[]]
  'update:search': [search: string]
}>()

const { t } = useI18n()

function onSearch(val: string) {
  emit('update:search', val)
}

function addFilter() {
  const next = [...props.filters, { column: props.columns[0]?.jsName || 'id', op: 'eq' as const, value: '' }]
  emit('update:filters', next)
}

function removeFilter(idx: number) {
  emit('update:filters', props.filters.filter((_, i) => i !== idx))
}

function clearFilters() {
  emit('update:filters', [])
}
</script>
