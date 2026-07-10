<template>
  <UPopover :content="{ align: 'end' }">
    <UButton icon="i-lucide-columns-3" color="neutral" variant="outline" size="xs" :label="t('admin.table.columns')" />
    <template #content>
      <div class="p-2 w-56 max-h-80 overflow-auto">
        <div class="flex items-center justify-between mb-2 px-1">
          <span class="text-xs font-medium text-muted">{{ t('admin.table.columns') }}</span>
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" :label="t('admin.table.showAll')" @click="$emit('showAll')" />
          </div>
        </div>
        <div class="space-y-1">
          <label
            v-for="col in columns"
            :key="col.jsName"
            class="flex items-center gap-2 px-2 py-1 rounded hover:bg-elevated/50 cursor-pointer"
          >
            <UCheckbox
              :model-value="!hidden.has(col.jsName)"
              @update:model-value="$emit('toggle', col.jsName)"
            />
            <span class="text-xs truncate">{{ col.jsName }}</span>
            <span class="text-muted text-[10px] ml-auto">{{ col.dataType }}</span>
          </label>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

defineProps<{
  columns: ColumnMeta[]
  hidden: Set<string>
}>()

defineEmits<{
  toggle: [jsName: string]
  showAll: []
}>()

const { t } = useI18n()
</script>
