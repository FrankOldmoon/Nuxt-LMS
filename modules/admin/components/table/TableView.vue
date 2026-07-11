<template>
  <div class="border border-default rounded-lg overflow-hidden">
    <div class="overflow-auto max-h-[60vh]">
      <table class="min-w-full text-sm">
        <thead class="sticky top-0 bg-elevated z-30">
          <tr class="border-b border-default">
            <th v-if="canDelete" class="w-10 px-2 py-2 sticky left-0 z-40 bg-elevated">
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
          <TableRow
            v-for="row in rows"
            :key="rowKeyOf(row)"
            :row="row"
            :visible-columns="visibleColumns"
            :selected-keys="selectedKeys"
            :can-edit="canEdit"
            :can-delete="canDelete"
            :include-deleted="includeDeleted"
            :row-key-of="rowKeyOf"
            :fk-labels="fkLabels"
            @toggle-select="$emit('toggleSelect', $event)"
            @view="$emit('view', $event)"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
            @restore="$emit('restore', $event)"
            @remove="$emit('remove', $event)"
          />
          <tr v-if="rows.length === 0">
            <td :colspan="visibleColumns.length + (canDelete ? 1 : 0) + (canEdit || canDelete ? 1 : 0)" class="px-3 py-8 text-center text-muted text-sm">
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
  rowKeyOf: (row: Record<string, any>) => string
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

const firstColStickyHeader = computed(() =>
  props.canDelete
    ? 'sticky left-10 z-40 bg-elevated'
    : 'sticky left-0 z-40 bg-elevated',
)
</script>
