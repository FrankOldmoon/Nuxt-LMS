import type { ColumnMeta, FilterCondition, TableMeta } from '../utils/types'

/**
 * 表管理核心状态机：分页 / 排序 / 搜索 / 筛选 / 软删除切换 / 批量选择 / CRUD / 导入导出
 *
 * 复合主键表（无 id）：selection 改用 string key（PK 列拼 '-'），批量操作走
 * TableOverride.delete 覆盖（不再走通用 /api/crud/[table]/batch 的 inArray(id)）。
 */
export function useAdminTable(tableName: MaybeRefOrGetter<string>) {
  const name = computed(() => toValue(tableName))
  const toast = useToast()
  const { t } = useI18n()

  // ====================== 状态 ======================
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
   * 行稳定 key：有 id 用 String(id)，否则用 PK 列拼 '-'。
   * 与 TableView.vue 内部 rowKey 保持一致。
   */
  function rowKeyOf(row: Record<string, any>): string {
    if (hasId.value) return row.id != null ? String(row.id) : JSON.stringify(row)
    const pkCols = columns.value.filter((c) => c.isPrimaryKey)
    if (pkCols.length === 0) return JSON.stringify(row)
    return pkCols.map((c) => String(row[c.jsName])).join('-')
  }

  // ====================== 列可见性（持久化到后端 configs 表，跨管理员/设备共享） ======================
  const hiddenColumns = ref<Set<string>>(new Set())

  /** 从后端拉取列配置；SSR 跳过（命令式 cRequest 走 $fetch 不转发 Cookie，admin 守卫 client-only） */
  async function loadHidden() {
    if (import.meta.server) return
    try {
      const data = await cRequest<{ hidden: string[] }>(`/api/admin/columns/${name.value}`)
      hiddenColumns.value = new Set(data?.hidden ?? [])
    } catch {
      // 后端请求失败时保留当前 hiddenColumns，不影响已有渲染
    }
  }

  /** 保存列配置到后端（fire-and-forget，失败静默） */
  function saveColumnConfig() {
    if (import.meta.server) return
    cRequest(`/api/admin/columns/${name.value}`, {
      method: 'PUT',
      body: { hidden: [...hiddenColumns.value] },
    }).catch(() => {
      // 忽略保存失败
    })
  }

  function toggleColumn(jsName: string) {
    if (hiddenColumns.value.has(jsName)) hiddenColumns.value.delete(jsName)
    else hiddenColumns.value.add(jsName)
    hiddenColumns.value = new Set(hiddenColumns.value) // 触发响应式
    saveColumnConfig()
  }

  function showAllColumns() {
    hiddenColumns.value = new Set()
    saveColumnConfig()
  }

  const visibleColumns = computed(() => columns.value.filter((c) => !hiddenColumns.value.has(c.jsName)))

  // ====================== 查询构建 ======================
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

  // ====================== 加载 ======================
  async function load() {
    // SSR 不转发 Cookie（命令式 cRequest 走 $fetch），admin 守卫 client-only → 跳过 SSR 拉取
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

  /** 切换排序（点击表头：asc → desc → 取消） */
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

  /** 搜索（防抖 300ms 后加载） */
  let searchTimer: any = null
  function applySearch(value: string) {
    search.value = value
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      page.value = 1
      load()
    }, 300)
  }

  /** 应用筛选（设置后由 deep watcher 触发加载） */
  function applyFilters(next: FilterCondition[]) {
    filters.value = next
    page.value = 1
  }

  // 筛选项就地变更（v-model 修改 column/op/value）时防抖重新加载
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

  /** 切换垃圾桶 / 普通模式 */
  function toggleTrash() {
    includeDeleted.value = !includeDeleted.value
    selectedKeys.value = new Set()
    page.value = 1
    load()
  }

  /** 翻页 */
  function setPage(p: number) {
    page.value = p
    load()
  }

  function setPageSize(size: number) {
    pageSize.value = size
    page.value = 1
    load()
  }

  // ====================== 选择（复合主键感知：用 string key） ======================
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

  /** 当前选中的行（用于批量操作） */
  const selectedRows = computed(() => rows.value.filter((r) => selectedKeys.value.has(rowKeyOf(r))))

  // 保留 selectedArray 别名 → 旧 UI/批量条仍用 .length
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
   * 批量操作（delete/remove/restore）：
   * - 复合主键表或注册了 TableOverride.delete 的表 → 走覆盖
   * - 普通表 → 走通用 /api/crud/[table]/batch，body: { ids, action }
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

  // ====================== 导入 / 导出 ======================
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
    // 状态
    page, pageSize, sort, search, filters, includeDeleted,
    selectedKeys, selectedArray, selectedRows, allSelected, rows, total, pending, meta,
    columns, visibleColumns, hiddenColumns, readOnly, labelColumn, hasId,
    rowKeyOf,
    // 列控制
    toggleColumn, showAllColumns, loadHidden,
    // 加载与查询
    load, toggleSort, applySearch, applyFilters, toggleTrash, setPage, setPageSize,
    // 选择
    toggleSelect, toggleSelectAll,
    // CRUD
    addRow, updateRow, batchDelete, batchRemove, batchRestore,
    // 导入导出
    exportRows, importRows,
  }
}
