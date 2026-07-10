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
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
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
            <UButton color="neutral" variant="ghost" :label="t('admin.form.cancel')" @click="open = false" />
            <UButton color="primary" :label="t('admin.table.importConfirm')" :loading="importing" @click="onImport" />
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
const { t } = useI18n()
const toast = useToast()

const sheetRef = ref<any>(null)
const importing = ref(false)
const result = ref<{ inserted: number; errors: string[] } | null>(null)

const headers = computed(() => props.columns.map((c) => c.jsName))
const initialData = computed(() => {
  // 仅表头行 + 一个空示例行
  const data: Record<number, Record<number, { v: any }>> = {
    1: headers.value.reduce((acc, _h, idx) => {
      acc[idx] = { v: '' }
      return acc
    }, {} as Record<number, { v: any }>),
  }
  return data
})

async function onImport() {
  if (!sheetRef.value) return
  importing.value = true
  try {
    const rawRows = sheetRef.value.getRows() as any[][]
    const rows: Record<string, any>[] = rawRows
      .filter((r) => r && r.some((v) => v !== '' && v != null))
      .map((r) => {
        const obj: Record<string, any> = {}
        headers.value.forEach((h, idx) => {
          obj[h] = r[idx] ?? ''
        })
        return obj
      })
    if (rows.length === 0) {
      toast.add({ title: t('admin.table.noData'), color: 'warning' })
      return
    }
    emit('import', rows)
  } finally {
    importing.value = false
  }
}

function downloadTemplate() {
  const csv = [headers.value.join(','), headers.value.map(() => '').join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

watch(open, (val) => {
  if (val) result.value = null
})
</script>
