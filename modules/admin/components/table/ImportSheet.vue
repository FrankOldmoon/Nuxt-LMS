<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-5xl' }">
    <template #content>
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-base font-semibold">{{ t('admin.table.importTitle') }}</h3>
            <p class="text-xs text-muted mt-0.5">{{ t('admin.table.importHint') }}</p>
          </div>
          <div class="flex gap-2">
            <UButton icon="i-lucide-download" color="neutral" variant="outline" size="xs" :label="t('admin.table.downloadTemplate')" @click="downloadTemplate" />
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
          </div>
        </div>

        <div class="h-[420px] border border-default rounded overflow-hidden">
          <Sheet
            v-if="open"
            ref="sheetRef"
            :headers="headers"
            :initial-data="initialData"
            :row-count="60"
            :show-tools="true"
          />
        </div>

        <div class="flex items-center justify-between mt-3">
          <div class="text-xs text-muted">
            <span v-if="result">{{ t('admin.table.imported', { inserted: result.inserted }) }}<span v-if="result.errors.length" class="text-error"> · {{ t('admin.table.importErrors', { count: result.errors.length }) }}</span></span>
          </div>
          <div class="flex gap-2">
            <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="close" />
            <UButton color="primary" :label="t('admin.table.importConfirm')" :loading="importing" @click="doImport" />
          </div>
        </div>

        <div v-if="result?.errors.length" class="mt-2 max-h-32 overflow-auto text-xs text-error space-y-0.5">
          <div v-for="(err, i) in result.errors" :key="i">{{ err }}</div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  columns: ColumnMeta[]
}>()

const emit = defineEmits<{
  import: [rows: Record<string, any>[]]
}>()

const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

const { t, sheetRef, importing, result, headers, initialData, doImport, downloadTemplate } =
  useImportSheet(() => props.columns, open, (rows) => emit('import', rows))
</script>
