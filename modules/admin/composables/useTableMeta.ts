import type { TableMetaSummary, ColumnMeta, TableMeta } from '../utils/types'

/**
 * 获取所有表的元数据（一次拉取，全局缓存于 useState）
 * 供菜单构建与表页初始化使用。
 */
export function useTablesMeta() {
  const tables = useState<TableMetaSummary[]>('admin:tables', () => [])

  async function load() {
    // admin 守卫为 client-only，命令式 cRequest（$fetch）在 SSR 不转发 Cookie → 401。
    // SSR 阶段跳过，渲染空壳；客户端 hydration 重新执行 setup 时带 Cookie 拉取。
    if (import.meta.server) return tables.value
    if (tables.value.length > 0) return tables.value
    const data = await cRequest<TableMetaSummary[]>('/api/admin/tables')
    tables.value = data || []
    return tables.value
  }

  return { tables, load }
}

/**
 * 获取指定表的元数据（基于全局缓存）
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

  /** 初始化（确保元数据已加载） */
  async function ensure() {
    await load()
    return summary.value
  }

  return { summary, columns, readOnly, labelColumn, ensure, tables }
}
