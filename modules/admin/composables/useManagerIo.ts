/**
 * Manager import/export modal orchestration
 *
 * Manages importOpen / exportOpen / exportRows / exporting state,
 * encapsulates onImport (fetch + toast) and openExport (fetch then open modal).
 *
 * Caller passes importRows / fetchExportRows returned by useAdminTable.
 */
export function useManagerIo(
  importRows: (rows: Record<string, any>[]) => Promise<{ inserted: number; errors: any[] }>,
  fetchExportRows: () => Promise<Record<string, any>[]>,
) {
  const { t } = useI18n()
  const toast = useToast()

  const importOpen = ref(false)
  const exportOpen = ref(false)
  const exportRows = ref<Record<string, any>[]>([])
  const exporting = ref(false)

  async function onImport(rowsData: Record<string, any>[]) {
    importOpen.value = false
    const result = await importRows(rowsData)
    toast.add({ title: t('admin.table.imported', { inserted: result.inserted }), color: result.errors.length ? 'warning' : 'success' })
  }

  async function openExport() {
    exporting.value = true
    try {
      exportRows.value = await fetchExportRows()
      exportOpen.value = true
    } catch (err: any) {
      toast.add({ title: err?.message || 'export failed', color: 'error' })
    } finally {
      exporting.value = false
    }
  }

  return { importOpen, exportOpen, exportRows, exporting, onImport, openExport }
}
