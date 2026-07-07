/**
 * 格式化工具函数
 */

/**
 * 将数据库返回的时间字符串转为本地 Date
 * Postgres timestamp（不带时区）返回的 ISO 字符串带 Z 后缀会被误当成 UTC，
 * 这里去掉 Z 后缀使其按本地时区解析
 */
function parseLocalTime(time?: string | null): Date | null {
  if (!time) return null
  // 去掉末尾的 Z（UTC 标记），让 new Date 按本地时区解析
  const normalized = time.endsWith('Z') ? time.slice(0, -1) : time
  return new Date(normalized)
}

/** 格式化时间为本地可读字符串（跟随用户 locale） */
export function formatTime(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 格式化日期为本地短日期 */
export function formatDate(time?: string | null): string {
  const d = parseLocalTime(time)
  if (!d || isNaN(d.getTime())) return ''
  return d.toLocaleDateString()
}

