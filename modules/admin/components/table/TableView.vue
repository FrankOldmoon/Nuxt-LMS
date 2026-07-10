<template>
  <div class="border border-default rounded-lg overflow-hidden">
    <div class="overflow-auto max-h-[60vh]">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-elevated z-30">
          <tr class="border-b border-default">
            <th v-if="hasCheckbox" class="w-10 px-2 py-2 sticky left-0 z-40 bg-elevated">
              <UCheckbox
                :model-value="allSelected"
                @update:model-value="$emit('toggleSelectAll')"
              />
            </th>
            <th
              v-for="(col, idx) in visibleColumns"
              :key="col.jsName"
              :class="[
                'px-3 py-2 text-left font-medium whitespace-nowrap cursor-pointer select-none hover:bg-default/50',
                idx === 0 ? firstColStickyHeader : '',
              ]"
              @click="$emit('sort', col.jsName)"
            >
              <div class="inline-flex items-center gap-1">
                <span>{{ col.jsName }}</span>
                <UIcon
                  v-if="sort?.column === col.jsName"
                  :name="sort.dir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="text-primary text-xs"
                />
              </div>
            </th>
            <th v-if="canEdit || canDelete" class="px-3 py-2 text-right font-medium w-32 sticky right-0 z-40 bg-elevated">{{ t('admin.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="rowKeyOf(row)"
            class="group border-b border-default/50 hover:bg-elevated/30"
          >
            <td v-if="hasCheckbox" class="px-2 py-1.5 sticky left-0 z-20 bg-default group-hover:bg-elevated">
              <UCheckbox
                :model-value="selectedKeys.has(rowKeyOf(row))"
                @update:model-value="$emit('toggleSelect', rowKeyOf(row))"
              />
            </td>
            <td
              v-for="(col, idx) in visibleColumns"
              :key="col.jsName"
              :class="[
                'px-3 py-1.5 align-middle',
                idx === 0 ? firstColStickyBody : '',
              ]"
            >
              <TableCellView
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
          <tr v-if="rows.length === 0">
            <td :colspan="visibleColumns.length + (hasCheckbox ? 1 : 0) + (canEdit || canDelete ? 1 : 0)" class="px-3 py-8 text-center text-muted text-sm">
              {{ pending ? '...' : t('admin.table.noData') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  visibleColumns: ColumnMeta[]
  rows: Record<string, any>[]
  selectedKeys: Set<string>
  allSelected: boolean
  sort: { column: string; dir: 'asc' | 'desc' } | null
  includeDeleted: boolean
  canEdit: boolean
  canDelete: boolean
  hasId: boolean
  pending: boolean
  /** 行 → string key（复合主键表 PK 拼 '-'，普通表 String(id)） */
  rowKeyOf: (row: Record<string, any>) => string
  /** FK 标签映射 { [columnJsName]: { [id]: label } }，由父组件统一拉取 */
  fkLabels?: Record<string, Record<number, string>>
}>()

defineEmits<{
  sort: [column: string]
  toggleSelect: [key: string]
  toggleSelectAll: []
  view: [row: Record<string, any>]
  edit: [row: Record<string, any>]
  delete: [row: Record<string, any>]
  restore: [row: Record<string, any>]
  remove: [row: Record<string, any>]
}>()

const { t } = useI18n()

/** 是否渲染 checkbox 列（可删除即显示，不再依赖 hasId — 复合主键表 + delete 覆盖也可勾选） */
const hasCheckbox = computed(() => props.canDelete)

/**
 * 首数据列 sticky 偏移：有 checkbox 时 left-10（让出 40px），否则 left-0。
 * 返回字面量类名串（Tailwind JIT 需在源码中可见完整类名）。
 */
const firstColStickyHeader = computed(() =>
  hasCheckbox.value
    ? 'sticky left-10 z-40 bg-elevated'
    : 'sticky left-0 z-40 bg-elevated',
)
const firstColStickyBody = computed(() =>
  hasCheckbox.value
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
