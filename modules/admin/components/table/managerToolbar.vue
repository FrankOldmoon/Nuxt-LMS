<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="flex items-center gap-2">
      <UButton
        v-if="canEdit"
        icon="i-lucide-plus"
        color="primary"
        size="xs"
        :label="t('admin.table.add')"
        @click="emit('add')"
      />
      <UButton
        icon="i-lucide-upload"
        color="neutral"
        variant="outline"
        size="xs"
        :label="t('admin.table.import')"
        @click="emit('import')"
      />
      <UButton
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        size="xs"
        :label="t('admin.table.export')"
        :loading="exporting"
        @click="emit('export')"
      />
      <TableColumnToggle
        :columns="columns"
        :hidden="hiddenColumns"
        @toggle="emit('toggle-column', $event)"
        @show-all="emit('show-all')"
      />
    </div>

    <div class="ml-auto flex items-center gap-2">
      <span class="text-xs text-muted">{{ t('admin.table.total', { count: total }) }}</span>
      <UButton
        :icon="includeDeleted ? 'i-lucide-list' : 'i-lucide-trash'"
        :color="includeDeleted ? 'neutral' : 'error'"
        :variant="includeDeleted ? 'solid' : 'outline'"
        size="xs"
        :label="includeDeleted ? t('admin.table.normal') : t('admin.table.trash')"
        @click="emit('toggle-trash')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  canEdit: boolean
  exporting: boolean
  includeDeleted: boolean
  total: number
  columns: ColumnMeta[]
  hiddenColumns: Set<string>
}>()

const emit = defineEmits<{
  add: []
  import: []
  export: []
  'toggle-column': [col: string]
  'show-all': []
  'toggle-trash': []
}>()

const { t } = useI18n()
</script>
