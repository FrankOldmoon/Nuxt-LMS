import type { ColumnMeta } from '../utils/types'
import { cellTypeFor, isImageColumn, isFileColumn, isIconColumn } from '../utils/widgetMap'

/**
 * 单元格视图：类型判定与各类展示值的派生
 */
export function useCellView(column: () => ColumnMeta, cellValue: () => any) {
  const type = computed(() => {
    const col = column()
    const v = cellValue()
    if (isFileColumn(col) && v) return 'file'
    if (isIconColumn(col) && typeof v === 'string' && v) return 'icon'
    if (isImageColumn(col) && typeof v === 'string' && v) return 'image'
    return cellTypeFor(col)
  })

  const isEmpty = computed(() => {
    const v = cellValue()
    return v === null || v === undefined || v === ''
  })

  const rawString = computed(() => {
    const v = cellValue()
    return v === null || v === undefined ? '' : String(v)
  })

  const dateLabel = computed(() => {
    const v = cellValue()
    if (!v) return ''
    const d = new Date(v)
    if (isNaN(d.getTime())) return String(v)
    return d.toLocaleString()
  })

  const jsonPretty = computed(() => {
    try {
      return JSON.stringify(cellValue(), null, 2)
    } catch {
      return String(cellValue())
    }
  })

  const textLabel = computed(() => {
    const s = rawString.value
    return s.length > 60 ? s.slice(0, 60) + '…' : s
  })

  function fullIconName(name: string) {
    if (!name) return 'i-lucide-circle'
    if (name.startsWith('i-') || name.includes(':')) return name
    return `i-lucide-${name}`
  }

  return { type, isEmpty, rawString, dateLabel, jsonPretty, textLabel, fullIconName }
}
