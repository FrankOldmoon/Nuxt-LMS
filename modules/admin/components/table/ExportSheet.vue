<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-5xl' }">
    <template #content>
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-base font-semibold">{{ t('admin.table.exportTitle') }}</h3>
            <p class="text-xs text-muted mt-0.5">{{ t('admin.table.exportHint') }}</p>
          </div>
          <div class="flex gap-2">
            <UButton icon="i-lucide-download" color="primary" size="xs" :label="t('admin.table.downloadCsv')" @click="downloadCsv" />
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
          </div>
        </div>

        <div class="h-[420px] border border-default rounded overflow-hidden">
          <Sheet
            v-if="open && initialData"
            ref="sheetRef"
            :headers="headers"
            :initial-data="initialData"
            :row-count="Math.max(30, (rows?.length || 0) + 5)"
            :show-tools="false"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ColumnMeta } from '../../utils/types'

const props = defineProps<{
  columns: ColumnMeta[]
  rows: Record<string, any>[]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const sheetRef = ref<any>(null)

const headers = computed(() => props.columns.map((c) => c.jsName))

const initialData = computed(() => {
  const data: Record<number, Record<number, { v: any }>> = {}
  props.rows.forEach((row, rIdx) => {
    const rowData: Record<number, { v: any }> = {}
    headers.value.forEach((h, cIdx) => {
      const v = row[h]
      if (v !== null && v !== undefined && v !== '') {
        rowData[cIdx] = { v: typeof v === 'object' ? JSON.stringify(v) : v }
      }
    })
    if (Object.keys(rowData).length) {
      data[rIdx + 1] = rowData
    }
  })
  return data
})

function escapeCsv(val: any): string {
  if (val == null) return ''
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv() {
  // Prefer sheet's current content (user may have rearranged), otherwise use original rows
  let csvRows: string[][] = []
  if (sheetRef.value) {
    const raw = sheetRef.value.getRows() as any[][]
    csvRows = raw.filter((r) => r && r.some((v) => v !== '' && v != null)).map((r) => r.map(String))
  }
  if (csvRows.length === 0) {
    csvRows = props.rows.map((row) => headers.value.map((h) => escapeCsv(row[h])))
  }
  const csv = [headers.value.map(escapeCsv).join(','), ...csvRows.map((r) => r.map(escapeCsv).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `export.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
