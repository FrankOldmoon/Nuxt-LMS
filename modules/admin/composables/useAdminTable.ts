import type { ColumnMeta, FilterCondition, TableMeta } from '../utils/types'

/**
 * Table management core state machine: pagination / sorting / search / filtering / soft-delete toggle / batch selection / CRUD / import-export
 *
 * Composite primary key tables (no id): selection uses string key (PK columns joined by '-'), batch operations go through
 * TableOverride.delete override (no longer uses generic /api/crud/[table]/batch inArray(id)).
 */
export function useAdminTable(tableName: MaybeRefOrGetter<string>) {
  const name = computed(() => toValue(tableName))
  const toast = useToast()
  const { t } = useI18n()

  // ====================== State ======================
  const page = ref(1)
  const pageSize = ref(20)
  const sort = ref<{ column: string; dir: 'asc' | 'desc' } | null>(null)
  const search = ref('')
  const filters = ref<FilterCondition[]>([])
  const includeDeleted = ref(false)
  const selectedKeys = ref<Set<string>>(new Set())
  const rows = ref<any[]>([])
  const total = ref(0)
  const pending = ref(false)
  const meta = ref<TableMeta | null>(null)

  const columns = computed<ColumnMeta[]>(() => meta.value?.columns ?? [])
  const readOnly = computed(() => meta.value?.readOnly ?? false)
  const labelColumn = computed(() => meta.value?.labelColumn)
  const hasId = computed(() => meta.value?.hasId ?? true)

  /**
   * Stable row key: uses String(id) if id exists, otherwise PK columns joined by '-'.
   * Consistent with rowKey inside TableView.vue.
   */
  function rowKeyOf(row: Record<string, any>): string {
    if (hasId.value) return row.id != null ? String(row.id) : JSON.stringify(row)
    const pkCols = columns.value.filter((c) => c.isPrimaryKey)
    if (pkCols.length === 0) return JSON.stringify(row)
    return pkCols.map((c) => String(row[c.jsName])).join('-')
  }

  // ====================== Column visibility (persisted to backend configs table, shared across admins/devices) ======================
  const hiddenColumns = ref<Set<string>>(new Set())

  /** Fetch column config from backend; skip on SSR (imperative cRequest uses $fetch without forwarding Cookie, admin guard is client-only) */
  async function loadHidden() {
    if (import.meta.server) return
    try {
      const data = await cRequest<{ hidden: string[] }>(`/api/admin/columns/${name.value}`)
      hiddenColumns.value = new Set(data?.hidden ?? [])
    } catch {
      // Keep current hiddenColumns on backend request failure, does not affect existing rendering
    }
  }

  /** Save column config to backend (fire-and-forget, silent on failure) */
  function saveColumnConfig() {
    if (import.meta.server) return
    cRequest(`/api/admin/columns/${name.value}`, {
      method: 'PUT',
      body: { hidden: [...hiddenColumns.value] },
    }).catch(() => {
      // Ignore save failure
    })
  }

  function toggleColumn(jsName: string) {
    if (hiddenColumns.value.has(jsName)) hiddenColumns.value.delete(jsName)
    else hiddenColumns.value.add(jsName)
    hiddenColumns.value = new Set(hiddenColumns.value) // Trigger reactivity
    saveColumnConfig()
  }

  function showAllColumns() {
    hiddenColumns.value = new Set()
    saveColumnConfig()
  }

  const visibleColumns = computed(() => columns.value.filter((c) => !hiddenColumns.value.has(c.jsName)))

  // ====================== Query building ======================
  function buildQuery(): string {
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize.value))
    if (sort.value) params.set('sort', `${sort.value.column}:${sort.value.dir}`)
    if (search.value.trim()) params.set('search', search.value.trim())
    if (includeDeleted.value) params.set('includeDeleted', 'true')
    if (filters.value.length > 0) params.set('filters', JSON.stringify(filters.value))
    return params.toString()
  }

  // ====================== Load ======================
  async function load() {
    // SSR does not forward Cookie (imperative cRequest uses $fetch), admin guard is client-only → skip SSR fetch
    if (import.meta.server) return
    pending.value = true
    try {
      const result = await cRequest<{ data: any[]; total: number; meta: TableMeta; columns: ColumnMeta[] }>(
        `/api/crud/${name.value}/list?${buildQuery()}`,
      )
      rows.value = result?.data ?? []
      total.value = result?.total ?? 0
      if (result?.meta) meta.value = result.meta
      selectedKeys.value = new Set()
    } catch (err: any) {
      toast.add({ title: err?.message || t('admin.table.noData'), color: 'error' })
      rows.value = []
      total.value = 0
    } finally {
      pending.value = false
    }
  }

  /** Toggle sort (click column header: asc → desc → cancel) */
  function toggleSort(column: string) {
    if (!sort.value || sort.value.column !== column) {
      sort.value = { column, dir: 'asc' }
    } else if (sort.value.dir === 'asc') {
      sort.value = { column, dir: 'desc' }
    } else {
      sort.value = null
    }
    page.value = 1
    load()
  }

  /** Search (loads after 300ms debounce) */
  let searchTimer: any = null
  function applySearch(value: string) {
    search.value = value
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      load()
    }, 300)
  }

  /** Apply filters (set, then deep watcher triggers load) */
  function applyFilters(next: FilterCondition[]) {
    filters.value = next
    page.value = 1
  }

  // Debounce reload when filter items are modified in place (v-model changes column/op/value)
  let filterTimer: any = null
  watch(
    filters,
    () => {
      if (filterTimer) clearTimeout(filterTimer)
      filterTimer = setTimeout(() => {
        page.value = 1
        load()
      }, 300)
    },
    { deep: true },
  )

  /** Toggle trash bin / normal mode */
  function toggleTrash() {
    includeDeleted.value = !includeDeleted.value
    selectedKeys.value = new Set()
    page.value = 1
    load()
  }

  /** Paginate */
  function setPage(p: number) {
    page.value = p
    load()
  }

  function setPageSize(size: number) {
    pageSize.value = size
    page.value = 1
    load()
  }

  // ====================== Selection (composite primary key aware: uses string key) ======================
  function toggleSelect(key: string) {
    if (selectedKeys.value.has(key)) selectedKeys.value.delete(key)
    else selectedKeys.value.add(key)
    selectedKeys.value = new Set(selectedKeys.value)
  }

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedKeys.value = new Set()
    } else {
      selectedKeys.value = new Set(rows.value.map((r) => rowKeyOf(r)))
    }
  }

  const allSelected = computed(
    () => rows.value.length > 0 && rows.value.every((r) => selectedKeys.value.has(rowKeyOf(r))),
  )

  /** Currently selected rows (for batch operations) */
  const selectedRows = computed(() => rows.value.filter((r) => selectedKeys.value.has(rowKeyOf(r))))

  // Keep selectedArray alias → old UI/batch bar still uses .length
  const selectedArray = computed(() => [...selectedKeys.value])

  // ====================== CRUD ======================
  async function addRow(data: Record<string, any>) {
    const result = await cRequest(`/api/crud/${name.value}/add`, { method: 'POST', body: data })
    toast.add({ title: t('admin.table.addSuccess'), color: 'success' })
    await load()
    return result
  }

  async function updateRow(id: number, data: Record<string, any>) {
    const result = await cRequest(`/api/crud/${name.value}/update`, { method: 'POST', body: { id, ...data } })
    toast.add({ title: t('admin.table.updateSuccess'), color: 'success' })
    await load()
    return result
  }

  /**
   * Batch operations (delete/remove/restore):
   * - Composite primary key tables or tables with registered TableOverride.delete → go through override
   * - Normal tables → go through generic /api/crud/[table]/batch, body: { ids, action }
   */
  async function batchAction(rowsIn: Record<string, any>[], action: 'delete' | 'remove' | 'restore') {
    if (rowsIn.length === 0) return
    const { override } = useTableOverride(() => name.value)
    const del = override.value?.delete
    let result: any
    if (del) {
      result = await del(rowsIn, action)
    } else {
      const ids = rowsIn.map((r) => Number(r.id))
      result = await cRequest(`/api/crud/${name.value}/batch`, { method: 'POST', body: { ids, action } })
    }
    const key = action === 'delete' ? 'admin.table.deleteSuccess'
      : action === 'remove' ? 'admin.table.removeSuccess'
        : 'admin.table.restoreSuccess'
    toast.add({ title: t(key, { count: rowsIn.length }), color: 'success' })
    selectedKeys.value = new Set()
    await load()
    return result
  }

  function batchDelete(rowsIn: Record<string, any>[]) {
    return batchAction(rowsIn, 'delete')
  }

  function batchRemove(rowsIn: Record<string, any>[]) {
    return batchAction(rowsIn, 'remove')
  }

  function batchRestore(rowsIn: Record<string, any>[]) {
    return batchAction(rowsIn, 'restore')
  }

  // ====================== Import / Export ======================
  async function exportRows(): Promise<any[]> {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('search', search.value.trim())
    if (includeDeleted.value) params.set('includeDeleted', 'true')
    if (filters.value.length > 0) params.set('filters', JSON.stringify(filters.value))
    const rowsData = await cRequest<any[]>(`/api/crud/${name.value}/export?${params.toString()}`)
    return rowsData || []
  }

  async function importRows(rowsData: Record<string, any>[]): Promise<{ inserted: number; errors: string[] }> {
    const result = await cRequest<{ inserted: number; errors: string[] }>(
      `/api/crud/${name.value}/import`,
      { method: 'POST', body: { rows: rowsData } },
    )
    await load()
    return result || { inserted: 0, errors: [] }
  }

  return {
    // State
    page, pageSize, sort, search, filters, includeDeleted,
    selectedKeys, selectedArray, selectedRows, allSelected, rows, total, pending, meta,
    columns, visibleColumns, hiddenColumns, readOnly, labelColumn, hasId,
    rowKeyOf,
    // Column control
    toggleColumn, showAllColumns, loadHidden,
    // Load and query
    load, toggleSort, applySearch, applyFilters, toggleTrash, setPage, setPageSize,
    // Selection
    toggleSelect, toggleSelectAll,
    // CRUD
    addRow, updateRow, batchDelete, batchRemove, batchRestore,
    // Import/Export
    exportRows, importRows,
  }
}
