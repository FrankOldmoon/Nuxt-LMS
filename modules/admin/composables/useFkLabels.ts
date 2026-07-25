import type { ComputedRef } from 'vue'
import type { ColumnMeta } from '../utils/types'

/**
 * 外键标签解析
 *
 * 扫描 columns 中的 FK 列，按 fkTable 去重拉取 /api/admin/fk-options，
 * 生成 { [colJsName]: { [fkId]: label } } 映射供 TableView/CShow 展示外键值。
 *
 * SSR 跳过（不转发 Cookie），客户端 hydration 后再拉取。
 *
 * 提取自 Manager.vue，供未来其他表展示场景复用。
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
