import type { Ref } from 'vue'
import type { ColumnMeta } from '../utils/types'

/**
 * Import modal logic: header/initial data generation, row extraction, template download, resultStatus
 */
export function useImportSheet(
  columns: () => ColumnMeta[],
  open: Ref<boolean>,
  onImport: (rows: Record<string, any>[]) => void,
) {
  const { t } = useI18n()
  const toast = useToast()

  const sheetRef = ref<any>(null)
  const importing = ref(false)
  const result = ref<{ inserted: number; errors: string[] } | null>(null)

  const headers = computed(() => columns().map((c) => c.jsName))

  const initialData = computed(() => {
    // Only header row + one empty example row
    const data: Record<number, Record<number, { v: any }>> = {
      1: headers.value.reduce((acc, _h, idx) => {
        acc[idx] = { v: '' }
        return acc
      }, {} as Record<number, { v: any }>),
    }
    return data
  })

  async function doImport() {
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
      onImport(rows)
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

  return { t, sheetRef, importing, result, headers, initialData, doImport, downloadTemplate }
}
