/**
 * 格式化工具函数
 */

/** 格式化时间为本地可读字符串 */
export function formatTime(time?: string | null): string {
  if (!time) return ''
  return new Date(time).toLocaleString()
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(time?: string | null): string {
  if (!time) return ''
  return new Date(time).toLocaleDateString()
}
