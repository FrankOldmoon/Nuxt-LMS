<template>
  <div
    v-if="selectedRows.length > 0"
    class="flex flex-wrap items-center gap-2 p-2 bg-elevated/50 rounded-lg"
  >
    <span class="text-xs font-medium">{{ t('admin.table.selected', { count: selectedRows.length }) }}</span>
    <div class="flex gap-1 ml-auto">
      <template v-if="!includeDeleted">
        <UButton icon="i-lucide-trash-2" color="error" variant="soft" size="xs" :label="t('admin.table.delete')" @click="emit('batch', 'delete')" />
      </template>
      <template v-else>
        <UButton icon="i-lucide-rotate-ccw" color="success" variant="soft" size="xs" :label="t('admin.table.restore')" @click="emit('batch', 'restore')" />
        <UButton icon="i-lucide-x" color="error" variant="soft" size="xs" :label="t('admin.table.remove')" @click="emit('batch', 'remove')" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedRows: Record<string, any>[]
  includeDeleted: boolean
}>()

const emit = defineEmits<{
  batch: [action: 'delete' | 'remove' | 'restore']
}>()

const { t } = useI18n()
</script>
