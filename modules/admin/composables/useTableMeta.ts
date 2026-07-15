import type { TableMetaSummary, ColumnMeta, TableMeta } from '../utils/types'

/**
 * Get metadata for all tables (fetched once, globally cached in useState)
 * Used for menu building and table page initialization.
 */
export function useTablesMeta() {
  const tables = useState<TableMetaSummary[]>('admin:tables', () => [])

  async function load() {
    // Admin guard is client-only, imperative cRequest ($fetch) does not forward Cookie on SSR → 401.
    // Skip during SSR, render empty shell; client hydration re-executes setup with Cookie to fetch.
    if (import.meta.server) return tables.value
    if (tables.value.length > 0) return tables.value
    const data = await cRequest<TableMetaSummary[]>('/api/admin/tables')
    tables.value = data || []
    return tables.value
  }

  return { tables, load }
}

/**
 * Get metadata for a specific table (based on global cache)
 */
export function useTableMeta(tableName: MaybeRefOrGetter<string>) {
  const { tables, load } = useTablesMeta()
  const name = computed(() => toValue(tableName))

  const summary = computed<TableMetaSummary | undefined>(() =>
    tables.value.find((t) => t.name === name.value),
  )

  const columns = computed<ColumnMeta[]>(() => summary.value?.columns ?? [])
  const readOnly = computed(() => summary.value?.readOnly ?? false)
  const labelColumn = computed(() => summary.value?.labelColumn)

  /** Initialize (ensure metadata is loaded) */
  async function ensure() {
    await load()
    return summary.value
  }

  return { summary, columns, readOnly, labelColumn, ensure, tables }
}
