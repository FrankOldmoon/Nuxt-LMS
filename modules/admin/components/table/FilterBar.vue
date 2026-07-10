<template>
  <div class="space-y-2">
    <!-- 搜索框 -->
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

    <!-- 多条件筛选 -->
    <div v-if="filters.length > 0" class="space-y-1">
      <div v-for="(f, idx) in filters" :key="idx" class="flex flex-wrap items-center gap-1">
        <USelectMenu
          v-model="f.column"
          :items="columnItems"
          value-key="value"
          size="sm"
          class="w-40"
        />
        <USelect
          v-model="f.op"
          :items="opItems"
          value-key="value"
          size="sm"
          class="w-36"
        />
        <template v-if="f.op !== 'null' && f.op !== 'notnull'">
          <UInput
            v-if="valueType(f.column) === 'number'"
            v-model.number="f.value"
            type="number"
            size="sm"
            class="w-32"
            placeholder="value"
          />
          <USelect
            v-else-if="valueType(f.column) === 'boolean'"
            v-model="f.value"
            :items="[{label: t('admin.cell.true'), value: true},{label: t('admin.cell.false'), value: false}]"
            value-key="value"
            size="sm"
            class="w-28"
          />
          <UInput
            v-else
            v-model="f.value"
            size="sm"
            class="w-40"
            placeholder="value"
          />
        </template>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="removeFilter(idx)" />
      </div>
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

const columnItems = computed(() =>
  props.columns
    .filter((c) => !c.isAutoIncrement || c.jsName === 'id')
    .map((c) => ({ label: c.jsName, value: c.jsName })),
)

const opItems = computed(() => [
  { label: t('admin.filter.eq'), value: 'eq' },
  { label: t('admin.filter.ne'), value: 'ne' },
  { label: t('admin.filter.contains'), value: 'contains' },
  { label: t('admin.filter.gt'), value: 'gt' },
  { label: t('admin.filter.lt'), value: 'lt' },
  { label: t('admin.filter.gte'), value: 'gte' },
  { label: t('admin.filter.lte'), value: 'lte' },
  { label: t('admin.filter.in'), value: 'in' },
  { label: t('admin.filter.null'), value: 'null' },
  { label: t('admin.filter.notnull'), value: 'notnull' },
])

function valueType(column: string): string {
  const col = props.columns.find((c) => c.jsName === column)
  return col?.dataType || 'string'
}

let searchTimer: any = null
function onSearch(val: string) {
  emit('update:search', val)
}

function addFilter() {
  const next = [...props.filters, { column: props.columns[0]?.jsName || 'id', op: 'eq' as const, value: '' }]
  emit('update:filters', next)
}

function removeFilter(idx: number) {
  const next = props.filters.filter((_, i) => i !== idx)
  emit('update:filters', next)
}

function clearFilters() {
  emit('update:filters', [])
}
</script>
