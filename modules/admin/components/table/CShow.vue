<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-2xl' }" scrollable>
    <template #content>
      <component
        v-if="hasShowOverride"
        :is="override.show"
        :row="row"
        :fk-labels="fkLabels"
        @close="open = false"
      />
      <div v-else class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold">{{ t('admin.table.recordDetail') }}</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
        </div>
        <div class="space-y-1 max-h-[70vh] overflow-auto">
          <div
            v-for="col in columns"
            :key="col.jsName"
            class="grid grid-cols-[160px_1fr] gap-2 py-1.5 border-b border-default/50 items-start"
          >
            <div class="text-xs font-medium text-muted pt-0.5">{{ col.jsName }}</div>
            <div class="min-w-0">
              <TableCellView
                :column="col"
                :value="row?.[col.jsName]"
                :fk-label="resolveFk(col)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  tableName: string
  columns: ColumnMeta[]
  row: Record<string, any> | null
  /** FK label mapping { [columnJsName]: { [id]: label } } */
  fkLabels?: Record<string, Record<number, string>>
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const { override, hasShowOverride } = useTableOverride(() => props.tableName)

function resolveFk(col: ColumnMeta): string | undefined {
  if (!col.fkTable || !props.fkLabels) return undefined
  const id = props.row?.[col.jsName]
  if (id == null) return undefined
  return props.fkLabels[col.jsName]?.[id]
}
</script>
