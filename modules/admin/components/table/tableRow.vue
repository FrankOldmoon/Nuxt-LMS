<template>
  <tr
    :key="rowKeyOf(row)"
    class="group border-b border-default/50 hover:bg-elevated/30"
  >
    <td v-if="canDelete" class="px-2 py-1.5 sticky left-0 z-20 bg-default group-hover:bg-elevated">
      <UCheckbox
        :model-value="selectedKeys.has(rowKeyOf(row))"
        @update:model-value="$emit('toggleSelect', rowKeyOf(row))"
      />
    </td>
    <td
      v-for="(col, idx) in visibleColumns"
      :key="col.jsName"
      :class="['px-3 py-1.5 align-middle', idx === 0 ? firstColStickyBody : '']"
    >
      <component
        :is="cellOverrides[col.jsName]"
        v-if="cellOverrides[col.jsName]"
        :row="row"
        :column="col"
        :value="row[col.jsName]"
        :fk-label="resolveFk(col, row)"
        @view="$emit('view', $event)"
      />
      <TableCellView
        v-else
        :column="col"
        :value="row[col.jsName]"
        :fk-label="resolveFk(col, row)"
      />
    </td>
    <td v-if="canEdit || canDelete" class="px-3 py-1.5 text-right whitespace-nowrap sticky right-0 z-20 bg-default group-hover:bg-elevated">
      <div class="inline-flex gap-1">
        <UButton icon="i-lucide-eye" color="neutral" variant="ghost" size="xs" @click="$emit('view', row)" />
        <UButton v-if="canEdit" icon="i-lucide-pencil" color="info" variant="ghost" size="xs" @click="$emit('edit', row)" />
        <UButton
          v-if="canDelete && !includeDeleted"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          @click="$emit('delete', row)"
        />
        <UButton
          v-if="canDelete && includeDeleted"
          icon="i-lucide-rotate-ccw"
          color="success"
          variant="ghost"
          size="xs"
          @click="$emit('restore', row)"
        />
        <UButton
          v-if="canDelete && includeDeleted"
          icon="i-lucide-x"
          color="error"
          variant="ghost"
          size="xs"
          @click="$emit('remove', row)"
        />
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { ColumnMeta } from '../../utils/types'

const props = withDefaults(defineProps<{
  row: Record<string, any>
  visibleColumns: ColumnMeta[]
  selectedKeys: Set<string>
  canEdit: boolean
  canDelete: boolean
  includeDeleted: boolean
  rowKeyOf: (row: Record<string, any>) => string
  fkLabels?: Record<string, Record<number, string>>
  /** 按列 jsName 覆盖单元格渲染（来自 TableOverride.cell） */
  cellOverrides?: Record<string, Component>
}>(), {
  cellOverrides: () => ({}),
})

defineEmits<{
  toggleSelect: [key: string]
  view: [row: Record<string, any>]
  edit: [row: Record<string, any>]
  delete: [row: Record<string, any>]
  restore: [row: Record<string, any>]
  remove: [row: Record<string, any>]
}>()

const firstColStickyBody = computed(() =>
  props.canDelete
    ? 'sticky left-10 z-20 bg-default group-hover:bg-elevated'
    : 'sticky left-0 z-20 bg-default group-hover:bg-elevated',
)

function resolveFk(col: ColumnMeta, row: Record<string, any>): string | undefined {
  if (!col.fkTable || !props.fkLabels) return undefined
  const id = row[col.jsName]
  if (id == null) return undefined
  return props.fkLabels[col.jsName]?.[id]
}
</script>
