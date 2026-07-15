import type { ComputedRef } from 'vue'
import type { ColumnMeta } from '../utils/types'

/**
 * Foreign key label resolution
 *
 * Scans FK columns in columns, fetches /api/admin/fk-options deduplicated by fkTable,
 * generates { [colJsName]: { [fkId]: label } } mapping for TableView/CShow to display foreign key values.
 *
 * Skipped on SSR (does not forward Cookie), fetched after client hydration.
 *
 * Extracted from Manager.vue, for future reuse in other table display scenarios.
 */
export function useFkLabels(columns: ComputedRef<ColumnMeta[]>) {
  const fkLabels = ref<Record<string, Record<number, string>>>({})
  const fkColumns = computed(() => columns.value.filter((c) => c.fkTable))

  watch(
    () => fkColumns.value.map((c) => `${c.jsName}:${c.fkTable}`).join(','),
    async () => {
      if (import.meta.server) return
      if (fkColumns.value.length === 0) {
        fkLabels.value = {}
        return
      }
      const map: Record<string, Record<number, string>> = {}
      const tableCache: Record<string, Record<number, string>> = {}
      for (const col of fkColumns.value) {
        if (!col.fkTable) continue
        if (!tableCache[col.fkTable]) {
          try {
            const opts = await cRequest<{ id: number; label: string }[]>(
              `/api/admin/fk-options?table=${col.fkTable}&label=${col.fkLabel || ''}`,
            )
            const lookup: Record<number, string> = {}
            for (const o of opts || []) lookup[o.id] = o.label
            tableCache[col.fkTable] = lookup
          } catch {
            tableCache[col.fkTable] = {}
          }
        }
        map[col.jsName] = tableCache[col.fkTable] ?? {}
      }
      fkLabels.value = map
    },
    { immediate: true },
  )

  return { fkLabels }
}
