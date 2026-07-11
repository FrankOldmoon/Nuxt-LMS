<template>
  <div class="flex flex-wrap items-center gap-1">
    <USelectMenu
      v-model="filter.column"
      :items="columnItems"
      value-key="value"
      size="sm"
      class="w-40"
    />
    <USelect
      v-model="filter.op"
      :items="opItems"
      value-key="value"
      size="sm"
      class="w-36"
    />
    <template v-if="filter.op !== 'null' && filter.op !== 'notnull'">
      <UInput
        v-if="valueType(filter.column) === 'number'"
        v-model.number="filter.value"
        type="number"
        size="sm"
        class="w-32"
        placeholder="value"
      />
      <USelect
        v-else-if="valueType(filter.column) === 'boolean'"
        v-model="filter.value"
        :items="[{label: t('admin.cell.true'), value: true},{label: t('admin.cell.false'), value: false}]"
        value-key="value"
        size="sm"
        class="w-28"
      />
      <UInput
        v-else
        v-model="filter.value"
        size="sm"
        class="w-40"
        placeholder="value"
      />
    </template>
    <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="$emit('remove')" />
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta, FilterCondition } from '../../utils/types'

const props = defineProps<{
  filter: FilterCondition
  columns: ColumnMeta[]
}>()

defineEmits<{
  remove: []
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
</script>
